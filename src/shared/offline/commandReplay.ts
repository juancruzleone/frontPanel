/**
 * R6c — Command replay/recovery: dependency-ordered replay with backoff,
 * outcome classification, dead-letter management. Observable progress.
 */
import { listPendingCommands, updateCommandStatus } from './commandJournal'
import { submitCommand, type SubmitResult, type SubmitCommandParams } from './commandSubmit'
import { hashCanonicalPayload } from './commandJournal'
import { getCommandStatus } from './commandJournal'
import type { OfflineCommand, CommandStatus } from './commandTypes'

export type ReplayOutcome = 'accepted' | 'conflicted' | 'retryable' | 'dead_letter' | 'paused'
export type ReplayPhase = 'idle' | 'replaying' | 'paused' | 'complete'

export interface ReplayProgress {
  phase: ReplayPhase
  total: number
  processed: number
  accepted: number
  conflicted: number
  retryable: number
  deadLetter: number
  lastCommandId?: string
  pauseReason?: string
}

export interface ReplayResult {
  outcome: ReplayOutcome
  accepted: number
  conflicted: number
  retryable: number
  deadLetter: number
  paused?: boolean
  pauseReason?: string
}

const MAX_RETRIES = 10
const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 5 * 60 * 1000

/**
 * Replay all pending commands for a scope in dependency order.
 * Stops on auth/lease/network errors (pause). Never clears unsynced intents.
 */
export async function replayPendingCommands(
  key: CryptoKey, scopeKey: string, tenantId: string, actorId: string,
  onProgress?: (p: ReplayProgress) => void,
): Promise<ReplayResult> {
  let pending: OfflineCommand[]
  try {
    pending = await listPendingCommands(key, scopeKey)
  } catch {
    return { outcome: 'paused', accepted: 0, conflicted: 0, retryable: 0, deadLetter: 0, paused: true, pauseReason: 'Command journal decryption failed' }
  }
  if (!pending.length) return { outcome: 'accepted', accepted: 0, conflicted: 0, retryable: 0, deadLetter: 0 }

  // Topological sort by dependencies
  const sorted = topoSort(pending)
  const progress: ReplayProgress = { phase: 'replaying', total: sorted.length, processed: 0, accepted: 0, conflicted: 0, retryable: 0, deadLetter: 0 }
  onProgress?.(progress)

  for (const cmd of sorted) {
    progress.lastCommandId = cmd.commandId

    // Check if dependencies are accepted — skip if blocked
    if (!(await depsAccepted(cmd, sorted, key, scopeKey, tenantId, actorId))) {
      // Parent not yet accepted in this batch — park as retryable
      progress.retryable++
      progress.processed++
      onProgress?.(progress)
      continue
    }

    // Check retry budget
    if ((cmd.retryCount ?? 0) >= MAX_RETRIES) {
      await updateCommandStatus(key, scopeKey, tenantId, actorId, cmd.commandId, { status: 'dead-letter', failureReason: 'Max retries exceeded' })
      progress.deadLetter++
      progress.processed++
      onProgress?.(progress)
      continue
    }

    const result = await submitOneCommand(cmd, tenantId, actorId)
    const classified = classifySubmitResult(result)

    if (classified.outcome === 'paused') {
      // Auth/lease/network error — stop replay, preserve all remaining as pending
      progress.phase = 'paused'
      progress.pauseReason = classified.pauseReason
      onProgress?.(progress)
      return { outcome: 'paused', accepted: progress.accepted, conflicted: progress.conflicted, retryable: progress.retryable + (sorted.length - progress.processed), deadLetter: progress.deadLetter, paused: true, pauseReason: classified.pauseReason }
    }

    // Update command status (both IDB and in-memory for dependency checks)
    const newStatus: CommandStatus = classified.outcome === 'accepted' ? 'succeeded'
      : classified.outcome === 'conflicted' ? 'conflict'
      : classified.outcome === 'dead_letter' ? 'dead-letter'
      : 'pending' // retryable commands remain replay-eligible
    await updateCommandStatus(key, scopeKey, tenantId, actorId, cmd.commandId, {
      status: newStatus, failureCode: classified.failureCode, failureReason: classified.failureReason,
      result: result.receipt?.result, retryCount: (cmd.retryCount ?? 0) + 1,
    })
    // Mutate in-memory so depsAccepted sees updated status for later commands
    cmd.status = newStatus
    cmd.retryCount = (cmd.retryCount ?? 0) + 1

    if (classified.outcome === 'accepted') progress.accepted++
    else if (classified.outcome === 'conflicted') progress.conflicted++
    else if (classified.outcome === 'dead_letter') progress.deadLetter++
    else progress.retryable++

    progress.processed++
    onProgress?.(progress)
  }

  progress.phase = 'complete'
  onProgress?.(progress)
  return { outcome: progress.retryable > 0 ? 'retryable' : 'accepted', accepted: progress.accepted, conflicted: progress.conflicted, retryable: progress.retryable, deadLetter: progress.deadLetter }
}

/** Get all dead-letter commands for a scope. */
export async function getDeadLetters(key: CryptoKey, scopeKey: string): Promise<OfflineCommand[]> {
  const { listPendingCommands: _ } = await import('./commandJournal') // avoid circular
  // Read all commands, filter dead-letter
  const all = await getAllCmds(key, scopeKey)
  return all.filter(c => c.status === 'dead-letter')
}

/** Compute backoff delay for a retry attempt. */
export function backoffDelay(attempt: number): number {
  if (attempt >= MAX_RETRIES) return 0
  const exponential = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS)
  return Math.floor(exponential * (0.25 + Math.random() * 0.5))
}

// ── Internal ────────────────────────────────────────────────────────────

async function submitOneCommand(cmd: OfflineCommand, tenantId: string, actorId: string): Promise<SubmitResult> {
  const payloadHash = await hashCanonicalPayload(cmd.payload)
  const params: SubmitCommandParams = {
    commandId: cmd.commandId, commandType: cmd.commandType, packageId: cmd.packageId,
    entityId: cmd.entityId, entityType: cmd.entityType ?? undefined, payload: cmd.payload,
    payloadHash, expectedEntityVersion: cmd.expectedEntityVersion,
    expectedFormVersion: cmd.expectedFormVersion ?? undefined, dependsOn: cmd.dependsOn,
  }
  return submitCommand(params, tenantId, actorId)
}

interface ClassifiedResult { outcome: ReplayOutcome; failureCode?: string; failureReason?: string; pauseReason?: string }

function classifySubmitResult(r: SubmitResult): ClassifiedResult {
  if (r.status === 'submitted' || r.status === 'idempotent_replay') return { outcome: 'accepted' }
  if (r.status === 'dependency_not_met') return { outcome: 'retryable', failureCode: 'DEPENDENCY_NOT_MET', failureReason: r.error }
  if (r.status === 'dependency_failed') return { outcome: 'conflicted', failureCode: 'DEPENDENCY_FAILED', failureReason: r.error }
  if (r.status === 'device_error' || r.status === 'lease_error') return { outcome: 'paused', pauseReason: r.error }
  if (r.status === 'no_trust' || r.status === 'no_device_key' || r.status === 'network_error') return { outcome: 'paused', pauseReason: r.error }
  if (r.status === 'payload_error' || r.status === 'signature_error') return { outcome: 'dead_letter', failureCode: 'VALIDATION_ERROR', failureReason: r.error }
  return { outcome: 'retryable', failureReason: r.error }
}

async function depsAccepted(cmd: OfflineCommand, all: OfflineCommand[], key: CryptoKey, scopeKey: string, tenantId: string, actorId: string): Promise<boolean> {
  if (!cmd.dependsOn?.length) return true
  const byId = new Map(all.map(c => [c.commandId, c]))
  for (const pid of cmd.dependsOn) {
    const parent = byId.get(pid)
    if (parent) {
      if (parent.status !== 'succeeded') return false
      continue
    }
    const persisted = await getCommandStatus(key, tenantId, actorId, pid, scopeKey)
    if (persisted?.status !== 'succeeded') return false
  }
  return true
}

function topoSort(commands: OfflineCommand[]): OfflineCommand[] {
  const byId = new Map(commands.map(c => [c.commandId, c]))
  const visited = new Set<string>()
  const result: OfflineCommand[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const cmd = byId.get(id)
    if (!cmd) return
    for (const pid of cmd.dependsOn ?? []) visit(pid)
    result.push(cmd)
  }

  for (const cmd of commands) visit(cmd.commandId)
  return result
}

async function getAllCmds(key: CryptoKey, scopeKey: string): Promise<OfflineCommand[]> {
  const { listPendingCommands: _ } = await import('./commandJournal')
  // Use the same IDB access pattern as listPendingCommands
  const db = await openDB()
  const tx = db.transaction('offlineCommands', 'readonly')
  const all = await getAll(tx.objectStore('offlineCommands'), scopeKey)
  const results: OfflineCommand[] = []
  for (const rec of all) {
    try {
      const { openJson } = await import('./envelope')
      const cmd = await openJson<OfflineCommand>({ key, envelope: rec.envelope, expectedScopeKey: scopeKey, expectedStore: 'offlineCommands' })
      results.push(cmd)
    } catch {
      throw new Error('Command journal decryption failed')
    }
  }
  return results
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB'))
    const r = indexedDB.open('GMAO_Offline_DB')
    r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result)
  })
}

function getAll(s: IDBObjectStore, scopeKey: string): Promise<Array<{ envelope: import('./envelope').EncryptedRecordEnvelope; scopeKey: string }>> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve((r.result as Array<{ envelope: import('./envelope').EncryptedRecordEnvelope; scopeKey: string }>).filter(x => x.scopeKey === scopeKey)); r.onerror = () => reject(r.error) })
}

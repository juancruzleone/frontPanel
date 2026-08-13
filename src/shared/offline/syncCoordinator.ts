/**
 * Offline sync coordinator — real orchestration of delta refresh, command
 * replay, evidence retry, and status aggregation. Resolves trust/lease/package
 * scopes and keys. Pauses on auth/lease/network errors. Returns sanitized
 * progress model. No UI coupling.
 */
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredDevice } from './deviceTrust'
import { getStoredLease } from './leaseGate'
import { listReadyPackages, getPersistedPackageKey, type PackageMeta } from './packageStorage'
import { applyPendingDeltas } from './packageDelta'
import { replayPendingCommands, getDeadLetters } from './commandReplay'
import { retryPendingEvidence } from './evidenceFlow'
import { listPendingCommands } from './commandJournal'

export type SyncPhase = 'idle' | 'delta' | 'replay' | 'evidence' | 'complete' | 'paused'

export interface PackageSyncResult {
  packageId: string
  deltaApplied: number
  commandsAccepted: number
  commandsConflicted: number
  commandsRetryable: number
  commandsDeadLettered: number
  evidenceSubmitted: number
  evidenceFailed: number
}

export interface SyncProgress {
  phase: SyncPhase
  packages: PackageSyncResult[]
  totalPending: number
  totalConflicted: number
  totalDeadLettered: number
  lastSyncAt: number | null
  pauseReason?: string
}

export interface SyncContext {
  tenantId: string; actorId: string; deviceId: string
  key: CryptoKey; kid: string
  packages: PackageMeta[]
}

/**
 * Resolve the active sync context from trust/lease/package stores.
 * Returns null if any required piece is missing (fail closed).
 */
export async function resolveSyncContext(): Promise<{ ctx?: SyncContext; error?: string }> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { error: 'Trust not ready' }

  const raw = localStorage.getItem('auth-storage')
  if (!raw) return { error: 'No auth' }
  let tenantId: string, actorId: string
  try {
    const { state } = JSON.parse(raw)
    tenantId = state.tenantId; actorId = state.userId
    if (!tenantId || !actorId) return { error: 'No auth scope' }
  } catch { return { error: 'Auth parse error' } }

  const device = await getStoredDevice(`${tenantId}:${actorId}`)
  if (!device?.privateKeyHandle) return { error: 'No device key' }

  const lease = await getStoredLease()
  if (!lease?.lease) return { error: 'No lease' }
  if (lease.lease.tenantId !== tenantId || lease.lease.userId !== actorId || lease.lease.deviceId !== trust.deviceId) {
    return { error: 'Lease scope mismatch' }
  }

  const packages = await listReadyPackages(tenantId, actorId, trust.deviceId)
  // Packages may be empty (no offline data yet) — that's OK, not an error

  return {
    ctx: {
      tenantId, actorId, deviceId: trust.deviceId,
      key: device.privateKeyHandle, kid: lease.header.kid,
      packages,
    },
  }
}

/**
 * Run a full sync cycle: delta refresh → command replay → evidence retry.
 * Returns sanitized progress. Pauses on auth/lease/network errors.
 * Never touches other identities' data.
 */
export async function runSyncCycle(
  ctx: SyncContext,
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    phase: 'delta', packages: [], totalPending: 0,
    totalConflicted: 0, totalDeadLettered: 0, lastSyncAt: null,
  }

  const packageKeys = new Map<string, CryptoKey>()
  for (const pkg of ctx.packages) {
    const packageKey = await getPersistedPackageKey(pkg.scopeKey)
    if (!packageKey) {
      progress.phase = 'paused'
      progress.pauseReason = 'Package key unavailable'
      onProgress?.(progress)
      return progress
    }
    packageKeys.set(pkg.scopeKey, packageKey)
  }

  // Phase 1: Delta refresh per package
  for (const pkg of ctx.packages) {
    const deltaResult = await applyPendingDeltas(pkg.packageId)
    if (deltaResult.status === 'cursor_expired') {
      progress.phase = 'paused'
      progress.pauseReason = 'cursor_expired'
      onProgress?.(progress)
      return progress
    }
    if (deltaResult.status === 'no_trust' || deltaResult.status === 'fetch_failed') {
      progress.phase = 'paused'
      progress.pauseReason = deltaResult.error
      onProgress?.(progress)
      return progress
    }
    progress.packages.push({
      packageId: pkg.packageId,
      deltaApplied: deltaResult.applied ?? 0,
      commandsAccepted: 0, commandsConflicted: 0, commandsRetryable: 0, commandsDeadLettered: 0,
      evidenceSubmitted: 0, evidenceFailed: 0,
    })
    onProgress?.(progress)
  }

  // Phase 2: Command replay per package
  progress.phase = 'replay'
  for (let i = 0; i < ctx.packages.length; i++) {
    const pkg = ctx.packages[i]
    const scopeKey = `${ctx.tenantId}:${ctx.actorId}:${ctx.deviceId}:${pkg.packageId}`

    const replayResult = await replayPendingCommands(packageKeys.get(pkg.scopeKey)!, scopeKey, ctx.tenantId, ctx.actorId)
    if (replayResult.outcome === 'paused') {
      progress.phase = 'paused'
      progress.pauseReason = replayResult.pauseReason
      onProgress?.(progress)
      return progress
    }

    const pkgResult = progress.packages[i]
    if (pkgResult) {
      pkgResult.commandsAccepted = replayResult.accepted
      pkgResult.commandsConflicted = replayResult.conflicted
      pkgResult.commandsRetryable = replayResult.retryable
      pkgResult.commandsDeadLettered = replayResult.deadLetter
    }
    progress.totalConflicted += replayResult.conflicted
    progress.totalDeadLettered += replayResult.deadLetter
    onProgress?.(progress)
  }

  // Phase 3: Evidence retry per package
  progress.phase = 'evidence'
  for (let i = 0; i < ctx.packages.length; i++) {
    const pkg = ctx.packages[i]
    const evidenceResult = await retryPendingEvidence(packageKeys.get(pkg.scopeKey)!, ctx.tenantId, ctx.actorId, ctx.deviceId, pkg.packageId)
    const pkgResult = progress.packages[i]
    if (pkgResult) {
      pkgResult.evidenceSubmitted = evidenceResult.submitted
      pkgResult.evidenceFailed = evidenceResult.failed
    }
    onProgress?.(progress)
  }

  // Phase 4: Aggregate pending counts
  for (const pkg of ctx.packages) {
    const scopeKey = `${ctx.tenantId}:${ctx.actorId}:${ctx.deviceId}:${pkg.packageId}`
    let pending: Awaited<ReturnType<typeof listPendingCommands>>
    let deadLetters: Awaited<ReturnType<typeof getDeadLetters>>
    try {
      const packageKey = packageKeys.get(pkg.scopeKey)!
      pending = await listPendingCommands(packageKey, scopeKey)
      deadLetters = await getDeadLetters(packageKey, scopeKey)
    } catch {
      progress.phase = 'paused'
      progress.pauseReason = 'Command journal decryption failed'
      onProgress?.(progress)
      return progress
    }
    progress.totalPending += pending.length
    progress.totalDeadLettered += deadLetters.length
  }

  progress.phase = 'complete'
  progress.lastSyncAt = Date.now()
  onProgress?.(progress)
  return progress
}

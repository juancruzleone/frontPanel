/**
 * R6 — Command journal: record offline intents with idempotency,
 * dependency ordering, and encrypted persistence. Deferred: network replay.
 */
import { sealJson, openJson, type EncryptedRecordEnvelope } from './envelope'
import { sha256Hex, canonicalJSON } from './crypto'
import type { CommandType, CommandStatus, CommandReceipt, OfflineCommand } from './commandTypes'
import { COMMAND_SCHEMA_VERSION, COMMAND_ERROR_CODES } from './commandTypes'

const DB_NAME = 'GMAO_Offline_DB'
const CMD_STORE = 'offlineCommands'

const VALID_TYPES = new Set<string>(['start', 'maintenance', 'completion', 'evidence', 'client_maintenance_request'])

export interface RecordCommandParams {
  commandId: string; commandType: CommandType; payload: Record<string, unknown>
  entityId: string; entityType?: string; expectedEntityVersion?: number
  expectedFormVersion?: number; dependsOn?: string[]
  tenantId: string; actorId: string; deviceId: string; packageId: string
  key: CryptoKey; kid: string
}

export interface RecordCommandResult {
  receipt?: CommandReceipt
  error?: { message: string; code: string }
}

/** SHA-256 of canonicalJSON(payload) — matches backend hashCanonicalPayload. */
export const hashCanonicalPayload = (payload: Record<string, unknown>) => sha256Hex(new TextEncoder().encode(canonicalJSON(payload)))

/**
 * Record an offline command intent. Encrypted persistence, idempotency check,
 * dependency ordering. Returns receipt or error. No network call.
 */
export async function recordCommand(params: RecordCommandParams): Promise<RecordCommandResult> {
  const {
    commandId, commandType, payload, entityId, entityType, expectedEntityVersion,
    expectedFormVersion, dependsOn = [], tenantId, actorId, deviceId, packageId, key, kid,
  } = params

  // Validate command type
  if (!VALID_TYPES.has(commandType)) {
    return { error: { message: `Invalid command type: ${commandType}`, code: 'VALIDATION_ERROR' } }
  }

  const payloadHash = await hashCanonicalPayload(payload)
  const scopeKey = `${tenantId}:${actorId}:${deviceId}:${packageId}`
  const now = new Date().toISOString()

  // Check idempotency: same commandId in scope → all binding fields must match
  const existing = await findCommand(tenantId, actorId, commandType, commandId)
  if (existing) {
    const decrypted = await decryptCommand(existing, key, scopeKey)
    if (decrypted) {
      // Any difference in binding fields → reject (commandId reuse)
      if (decrypted.commandType !== commandType) {
        return { error: { message: 'Command ID reused with different type', code: COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED } }
      }
      if (decrypted.packageId !== packageId) {
        return { error: { message: 'Command ID reused with different package', code: COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED } }
      }
      if (decrypted.payloadHash !== payloadHash) {
        return { error: { message: 'Command ID reused with different payload', code: COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED } }
      }
      if (JSON.stringify([...(decrypted.dependsOn ?? [])].sort()) !== JSON.stringify([...dependsOn].sort())) {
        return { error: { message: 'Command ID reused with different dependencies', code: COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED } }
      }
      // All binding fields match → idempotent replay
      return { receipt: toReceipt(decrypted, true) }
    }
  }

  // Dependency check
  const dep = await checkDependencies(key, scopeKey, tenantId, actorId, dependsOn)
  const base = { commandId, commandType, tenantId, actorId, deviceId, packageId, payload, payloadHash, schemaVersion: COMMAND_SCHEMA_VERSION, entityId, entityType: entityType ?? null, expectedEntityVersion, expectedFormVersion: expectedFormVersion ?? null, dependsOn, retryCount: 0, createdAt: now, updatedAt: now }

  if (dep.blocked) {
    if (dep.deferred) {
      const cmd: OfflineCommand = { ...base, status: 'pending' }
      await persistCommand(cmd, key, kid, scopeKey)
      return { receipt: toReceipt(cmd, false) }
    }
    const cmd: OfflineCommand = { ...base, status: 'conflict', category: 'conflict', failureCode: dep.code!, failureReason: dep.reason! }
    await persistCommand(cmd, key, kid, scopeKey)
    return { receipt: toReceipt(cmd, false) }
  }

  const cmd: OfflineCommand = { ...base, status: 'pending' }
  await persistCommand(cmd, key, kid, scopeKey)
  return { receipt: toReceipt(cmd, false) }
}

/** Get a command receipt by commandId. */
export async function getCommandReceipt(key: CryptoKey, tenantId: string, actorId: string, commandType: string, commandId: string, scopeKey: string): Promise<CommandReceipt | null> {
  const existing = await findCommand(tenantId, actorId, commandType, commandId)
  if (!existing) return null
  const decrypted = await decryptCommand(existing, key, scopeKey)
  return decrypted ? toReceipt(decrypted, false) : null
}

/** Query command status from the encrypted journal. Returns null if not found. */
export async function getCommandStatus(key: CryptoKey, tenantId: string, actorId: string, commandId: string, scopeKey: string): Promise<{ status: CommandStatus } | null> {
  const existing = await findCommand(tenantId, actorId, '', commandId)
  if (!existing) return null
  const decrypted = await decryptCommand(existing, key, scopeKey)
  if (!decrypted) return null
  return { status: decrypted.status }
}

/** List all pending commands for a scope. */
export async function listPendingCommands(key: CryptoKey, scopeKey: string): Promise<OfflineCommand[]> {
  const all = await getAllCommands(scopeKey)
  const pending: OfflineCommand[] = []
  for (const rec of all) {
    const cmd = await decryptCommand(rec, key, scopeKey, true)
    if (cmd?.status === 'pending') pending.push(cmd)
  }
  return pending
}

/** List all conflict/failed/dead-letter commands for a scope. */
export async function listConflictedCommands(key: CryptoKey, scopeKey: string): Promise<OfflineCommand[]> {
  const all = await getAllCommands(scopeKey)
  const items: OfflineCommand[] = []
  for (const rec of all) {
    const cmd = await decryptCommand(rec, key, scopeKey, true)
    if (cmd && (cmd.status === 'conflict' || cmd.status === 'failed' || cmd.status === 'dead-letter')) items.push(cmd)
  }
  return items
}

export async function listCommands(key: CryptoKey, scopeKey: string): Promise<OfflineCommand[]> {
  const all = await getAllCommands(scopeKey)
  const items: OfflineCommand[] = []
  for (const rec of all) {
    const cmd = await decryptCommand(rec, key, scopeKey, true)
    if (cmd) items.push(cmd)
  }
  return items
}

/** Update a command's status and persist receipt fields. */
export async function updateCommandStatus(key: CryptoKey, scopeKey: string, tenantId: string, actorId: string, commandId: string, updates: { status: CommandStatus; failureCode?: string; failureReason?: string; result?: Record<string, unknown>; retryCount?: number }): Promise<void> {
  const existing = await findCommand(tenantId, actorId, '', commandId)
  if (!existing) return
  const cmd = await decryptCommand(existing, key, scopeKey)
  if (!cmd) return
  const now = new Date().toISOString()
  const updated: OfflineCommand = { ...cmd, ...updates, updatedAt: now }
  await persistCommand(updated, key, existing.envelope.kid ?? 'journal', scopeKey)
}

// ── Dependency ordering ─────────────────────────────────────────────────

async function checkDependencies(key: CryptoKey, scopeKey: string, tenantId: string, actorId: string, dependsOn: string[]): Promise<{ blocked: boolean; deferred?: boolean; code?: string; reason?: string }> {
  if (!dependsOn.length) return { blocked: false }
  for (const pid of dependsOn) {
    const parent = await findCommand(tenantId, actorId, '', pid)
    if (!parent) return { blocked: true, code: COMMAND_ERROR_CODES.DEPENDENCY_NOT_MET, reason: `Parent ${pid} not found` }
    const cmd = await decryptCommand(parent, key, scopeKey)
    if (!cmd) return { blocked: true, code: COMMAND_ERROR_CODES.DEPENDENCY_NOT_MET, reason: `Parent ${pid} unreadable` }
     if (cmd.status === 'pending' || cmd.status === 'processing') return { blocked: true, deferred: true, code: COMMAND_ERROR_CODES.DEPENDENCY_NOT_MET, reason: `Parent ${pid} is ${cmd.status}` }
    if (cmd.status === 'failed' || cmd.status === 'conflict' || cmd.status === 'dead-letter') return { blocked: true, code: COMMAND_ERROR_CODES.DEPENDENCY_FAILED, reason: `Parent ${pid} is ${cmd.status}` }
  }
  return { blocked: false }
}

// ── Receipt ─────────────────────────────────────────────────────────────

function toReceipt(c: OfflineCommand, idempotentReplay: boolean): CommandReceipt {
  return {
    commandId: c.commandId, commandType: c.commandType, tenantId: c.tenantId, actorId: c.actorId,
    deviceId: c.deviceId, packageId: c.packageId, schemaVersion: c.schemaVersion, payloadHash: c.payloadHash,
    entityId: c.entityId, entityType: c.entityType ?? null, expectedEntityVersion: c.expectedEntityVersion,
    expectedFormVersion: c.expectedFormVersion ?? null, dependsOn: c.dependsOn, status: c.status,
    category: c.category ?? null, result: c.result ?? null, failureCode: c.failureCode ?? null,
    failureReason: c.failureReason ?? null, retryCount: c.retryCount, createdAt: c.createdAt, updatedAt: c.updatedAt,
    idempotentReplay,
  }
}

// ── Encrypted IndexedDB persistence ─────────────────────────────────────

interface StoredCommand {
  id: string // tenantId:actorId:commandId (unique per owner scope)
  commandType: string // stored separately for idempotency check
  envelope: EncryptedRecordEnvelope
  scopeKey: string
}

async function persistCommand(cmd: OfflineCommand, key: CryptoKey, kid: string, scopeKey: string): Promise<void> {
  const envelope = await sealJson({ key, kid, scopeKey, store: CMD_STORE, value: cmd })
  const id = `${cmd.tenantId}:${cmd.actorId}:${cmd.commandId}`
  const db = await openDB()
  const tx = db.transaction(CMD_STORE, 'readwrite')
  tx.objectStore(CMD_STORE).put({ id, commandType: cmd.commandType, envelope, scopeKey })
  await txDone(tx)
}

async function findCommand(tenantId: string, actorId: string, commandType: string, commandId: string): Promise<StoredCommand | null> {
  const id = `${tenantId}:${actorId}:${commandId}`
  const db = await openDB()
  const tx = db.transaction(CMD_STORE, 'readonly')
  return getOne<StoredCommand>(tx.objectStore(CMD_STORE), id)
}

async function decryptCommand(rec: StoredCommand, key: CryptoKey, scopeKey: string, throwOnFailure = false): Promise<OfflineCommand | null> {
  try { return await openJson<OfflineCommand>({ key, envelope: rec.envelope, expectedScopeKey: scopeKey, expectedStore: CMD_STORE }) }
  catch (error) { if (throwOnFailure) throw error; return null }
}

async function getAllCommands(scopeKey: string): Promise<StoredCommand[]> {
  const db = await openDB()
  const tx = db.transaction(CMD_STORE, 'readonly')
  return getAll(tx.objectStore(CMD_STORE), scopeKey)
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB'))
    const r = indexedDB.open(DB_NAME)
    r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(CMD_STORE)) r.result.createObjectStore(CMD_STORE) }
  })
}

function getAll(s: IDBObjectStore, scopeKey: string): Promise<StoredCommand[]> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve((r.result as StoredCommand[]).filter(x => x.scopeKey === scopeKey)); r.onerror = () => reject(r.error) })
}

function getOne<T>(s: IDBObjectStore, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => { const r = s.get(key); r.onsuccess = () => resolve((r.result as T) ?? null); r.onerror = () => reject(r.error) })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
}

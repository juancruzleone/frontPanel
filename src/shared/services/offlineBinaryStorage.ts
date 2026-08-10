/**
 * R8 — Offline binary evidence queue: owner-scoped staging, SHA-256 content
 * hashing, AES-GCM-256 encryption at rest (R5 owner/device scope), stable
 * evidenceId binding to command/order/package/form, idempotent upload with
 * receipt management, tamper/scope/key failure quarantine, and identity purge.
 *
 * Never submits a command until its required evidence receipt is authoritative.
 * Fails closed on any integrity, scope, or key miss.
 */
import { buildScopeKey, getOrCreateDeviceId, type OfflineIdentityScope, type EncryptedRecordEnvelope } from '../offline/types'
import { sha256Hex } from '../offline/crypto'
import { openDB, getOrCreateStorageKey, encryptPayload, decryptPayload } from '../offline/storage'
import { fetchWithAuthRetry } from '../utils/apiHeaders'
import { getStoredLease, getStoredDevice } from '../offline/deviceTrust'

const STORE_NAME = 'stagedUploads'
const API_BASE = '/api/offline'

// ── Status lifecycle ───────────────────────────────────────────────────────

export type BinaryUploadStatus =
  | 'staged'        // encrypted blob in IndexedDB, not yet uploaded
  | 'uploading'     // POST in flight
  | 'accepted'      // server receipt received
  | 'quarantined'   // tamper, scope mismatch, or key failure
  | 'dead-letter'   // non-retryable backend rejection

export interface StagedBinaryRecord {
  id: string              // `${scopeKey}:${evidenceId}`
  evidenceId: string
  commandId: string
  orderId: string
  packageId: string
  formId?: string
  fileName: string
  contentType: string
  contentSize: number
  contentHash: string     // SHA-256 hex
  status: BinaryUploadStatus
  ownerScope: OfflineIdentityScope
  createdAt: number
  updatedAt: number
  // Encrypted blob (AES-GCM envelope, R5 owner/device scope)
  envelope: EncryptedRecordEnvelope
  // Server receipt (populated on accepted)
  receipt?: BinaryReceipt
  // Error detail (populated on quarantined / dead-letter)
  error?: string
  errorCode?: string
  retries: number
}

export interface BinaryReceipt {
  evidenceId: string
  commandId: string
  orderId: string
  packageId: string
  tenantId: string
  actorId: string
  deviceId: string
  contentHash: string
  contentSize: number
  contentType: string
  fileName: string | null
  schemaVersion: number
  status: string
  createdAt: string
  updatedAt: string
  idempotentReplay: boolean
}

// ── Backend error codes (mirrors offlineEvidence.services.js) ──────────────

export const EVIDENCE_ERROR_CODES = {
  DUPLICATE_EVIDENCE_ID: 'DUPLICATE_EVIDENCE_ID',
  HASH_MISMATCH: 'HASH_MISMATCH',
  SIZE_MISMATCH: 'SIZE_MISMATCH',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  SIZE_EXCEEDED: 'SIZE_EXCEEDED',
  CROSS_COMMAND_BINDING: 'CROSS_COMMAND_BINDING',
  BINARY_NOT_FOUND: 'BINARY_NOT_FOUND',
  BINARY_NOT_ACCEPTED: 'BINARY_NOT_ACCEPTED',
  DEVICE_NOT_REGISTERED: 'DEVICE_NOT_REGISTERED',
  DEVICE_REVOKED: 'DEVICE_REVOKED',
  OWNERSHIP_MISMATCH: 'OWNERSHIP_MISMATCH',
  LEASE_EXPIRED: 'LEASE_EXPIRED',
  LEASE_INVALID: 'LEASE_INVALID',
} as const

// ── Identity scope (auth + R1-registered device) ───────────────────────────

async function getBinaryScope(): Promise<OfflineIdentityScope | null> {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return null
    const { state } = JSON.parse(raw)
    if (!state?.tenantId || !state?.userId) return null
    const device = await getStoredDevice(`${state.tenantId}:${state.userId}`)
    const deviceId = device?.deviceId || getOrCreateDeviceId()
    return { tenantId: state.tenantId, userId: state.userId, deviceId }
  } catch { return null }
}

// ── Storage key for AES-GCM encryption ────────────────────────────────────

async function getBinaryStorageKey(scopeKey: string) {
  return getOrCreateStorageKey(scopeKey)
}

// ── Public API ─────────────────────────────────────────────────────────────

export const offlineBinaryStorage = {
  /**
   * Stage a binary blob: hash with SHA-256, encrypt under R5 owner/device
   * scope, persist to IndexedDB. Returns the evidenceId.
   */
  async stage(
    blob: Blob | File,
    binding: { evidenceId: string; commandId: string; orderId: string; packageId: string; formId?: string },
  ): Promise<{ evidenceId: string; contentHash: string; contentSize: number }> {
    const scope = await getBinaryScope()
    if (!scope) throw new Error('OFFLINE_BINARY_NO_SCOPE')

    // Read bytes and hash
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const contentHash = await sha256Hex(bytes)
    const contentSize = bytes.length

    // Encrypt under R5 owner/device scope
    const scopeKey = buildScopeKey(scope)
    const { key, kid } = await getBinaryStorageKey(scopeKey)
    const envelope = await encryptPayload(scopeKey, STORE_NAME, kid, key, bytes)

    const recordId = `${scopeKey}:${binding.evidenceId}`
    const fileName = blob instanceof File ? blob.name : 'upload'
    const contentType = blob.type || 'application/octet-stream'

    const record: StagedBinaryRecord = {
      id: recordId,
      evidenceId: binding.evidenceId,
      commandId: binding.commandId,
      orderId: binding.orderId,
      packageId: binding.packageId,
      formId: binding.formId,
      fileName,
      contentType,
      contentSize,
      contentHash,
      status: 'staged',
      ownerScope: scope,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      envelope,
      retries: 0,
    }

    await putRecord(record)
    return { evidenceId: binding.evidenceId, contentHash, contentSize }
  },

  /** Retrieve a staged record (does not decrypt the blob). */
  async get(evidenceId: string): Promise<StagedBinaryRecord | null> {
    const scope = await getBinaryScope()
    if (!scope) return null
    const recordId = `${buildScopeKey(scope)}:${evidenceId}`
    return getRecord(recordId)
  },

  /** List all staged records for the current scope. */
  async list(): Promise<StagedBinaryRecord[]> {
    const scope = await getBinaryScope()
    if (!scope) return []
    const scopeKey = buildScopeKey(scope)
    return getAllRecords().then(records =>
      records.filter(r => r.id.startsWith(`${scopeKey}:`))
    )
  },

  /** List staged records that are ready to upload (status=staged). */
  async listPending(): Promise<StagedBinaryRecord[]> {
    return (await this.list()).filter(r => r.status === 'staged')
  },

  /** List records that have an authoritative receipt. */
  async listAccepted(): Promise<StagedBinaryRecord[]> {
    return (await this.list()).filter(r => r.status === 'accepted')
  },

  /**
   * Decrypt and return the raw bytes of a staged binary.
   * Fails closed on tamper or missing key.
   */
  async getBytes(evidenceId: string): Promise<Uint8Array | null> {
    const record = await this.get(evidenceId)
    if (!record) return null
    const scope = await getBinaryScope()
    if (!scope) return null
    const scopeKey = buildScopeKey(scope)
    const { key } = await getBinaryStorageKey(scopeKey)
    return decryptPayload(key, record.envelope)
  },

  /**
   * Upload staged binary to POST /api/offline/binaries.
   * Verifies hash integrity before upload. Idempotent: same evidenceId +
   * same hash replays the receipt.
   *
   * Returns the receipt on success, or throws a typed error.
   */
  async upload(evidenceId: string): Promise<BinaryReceipt> {
    const scope = await getBinaryScope()
    if (!scope) throw new Error('OFFLINE_BINARY_NO_SCOPE')

    const record = await this.get(evidenceId)
    if (!record) throw new Error('OFFLINE_BINARY_NOT_FOUND')
    if (record.status === 'accepted' && record.receipt) return record.receipt
    if (record.status === 'quarantined' || record.status === 'dead-letter') {
      throw new Error(`OFFLINE_BINARY_${record.status.toUpperCase()}`)
    }

    // Mark uploading
    await updateRecord(record.id, { status: 'uploading', updatedAt: Date.now() })

    try {
      // Verify hash integrity before upload (tamper detection)
      const bytes = await this.getBytes(evidenceId)
      if (!bytes) {
        await quarantine(record.id, 'BLOB_DECRYPT_FAILED', 'Blob decryption failed')
        throw new Error('OFFLINE_BINARY_TAMPER')
      }
      const currentHash = await sha256Hex(bytes)
      if (currentHash !== record.contentHash) {
        await quarantine(record.id, 'HASH_MISMATCH', 'Content hash changed after staging')
        throw new Error('OFFLINE_BINARY_TAMPER')
      }

      // Get lease for R1 trust gate
      const scopeKey = buildScopeKey(scope)
      const lease = await getStoredLease(scopeKey)

      // POST to backend
      const body = {
        evidenceId: record.evidenceId,
        commandId: record.commandId,
        orderId: record.orderId,
        packageId: record.packageId,
        deviceId: scope.deviceId,
        contentHash: record.contentHash,
        contentSize: record.contentSize,
        contentType: record.contentType,
        fileName: record.fileName,
        ...(lease ? { lease: lease.claim, leaseHeader: { kid: lease.kid }, leaseSignature: lease.signature } : {}),
      }

      const response = await fetchWithAuthRetry(`${API_BASE}/binaries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        const receipt = data.receipt as BinaryReceipt
        await updateRecord(record.id, { status: 'accepted', receipt, updatedAt: Date.now(), retries: record.retries + 1 })
        return receipt
      }

      // Map backend error
      const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string } }
      const errorCode = errorBody?.error?.code
      const errorMessage = errorBody?.error?.message || `HTTP_${response.status}`
      const errorType = mapErrorCode(errorCode)

      if (errorType === 'retryable') {
        await updateRecord(record.id, { status: 'staged', error: errorMessage, errorCode, updatedAt: Date.now(), retries: record.retries + 1 })
        throw new Error(`OFFLINE_BINARY_RETRYABLE: ${errorCode}`)
      }

      // Non-retryable: dead-letter
      await updateRecord(record.id, { status: 'dead-letter', error: errorMessage, errorCode, updatedAt: Date.now(), retries: record.retries + 1 })
      throw new Error(`OFFLINE_BINARY_DEAD_LETTER: ${errorCode}`)
    } catch (error) {
      // Network errors are retryable
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        await updateRecord(record.id, { status: 'staged', error: 'network-error', updatedAt: Date.now(), retries: record.retries + 1 })
        throw new Error('OFFLINE_BINARY_NETWORK_ERROR')
      }
      throw error
    }
  },

  /**
   * Check if all evidence for a command has authoritative receipts.
   * Returns { ready, missing } where ready=true means the command can proceed.
   */
  async checkCommandEvidence(commandId: string): Promise<{ ready: boolean; missing: string[] }> {
    const allRecords = await this.list()
    const commandRecords = allRecords.filter(r => r.commandId === commandId)
    if (commandRecords.length === 0) return { ready: true, missing: [] }

    const missing = commandRecords
      .filter(r => r.status !== 'accepted')
      .map(r => r.evidenceId)

    return { ready: missing.length === 0, missing }
  },

  /** Remove a staged record. Only allowed for staged/quarantined/dead-letter. */
  async remove(evidenceId: string): Promise<void> {
    const record = await this.get(evidenceId)
    if (!record) return
    if (record.status === 'accepted') throw new Error('OFFLINE_BINARY_CANNOT_REMOVE_ACCEPTED')
    await deleteRecord(record.id)
  },

  /**
   * Purge all binary data for a scope. Called on logout/identity switch.
   * Completes BEFORE another identity can access the app.
   */
  async purgeScope(scope: OfflineIdentityScope): Promise<number> {
    const scopeKey = buildScopeKey(scope)
    const allRecords = await getAllRecords()
    let purged = 0
    for (const r of allRecords) {
      if (r.id.startsWith(`${scopeKey}:`)) {
        await deleteRecord(r.id)
        purged++
      }
    }
    return purged
  },

  // Backward-compatible aliases (R8b2: migrate callers to stage()/getBytes()/remove())
  async saveBinary(blob: Blob | File, _filename?: string): Promise<string> {
    const scope = await getBinaryScope()
    if (!scope) throw new Error('OFFLINE_BINARY_NO_SCOPE')
    const evidenceId = crypto.randomUUID()
    await this.stage(blob, { evidenceId, commandId: 'pending', orderId: 'pending', packageId: 'pending' })
    return `${buildScopeKey(scope)}:${evidenceId}`
  },
  async getBinary(id: string): Promise<Blob | null> {
    const rec = await getRecord(id); if (!rec) return null
    const scope = await getBinaryScope(); if (!scope) return null
    const { key } = await getBinaryStorageKey(buildScopeKey(scope))
    const bytes = await decryptPayload(key, rec.envelope).catch(() => null)
    return bytes ? new Blob([bytes]) : null
  },
  async removeBinary(id: string): Promise<void> { await deleteRecord(id) },
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────

async function putRecord(record: StagedBinaryRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record, record.id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

async function getRecord(id: string): Promise<StagedBinaryRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result ?? null)
  })
}

async function getAllRecords(): Promise<StagedBinaryRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result ?? [])
  })
}

async function updateRecord(id: string, updates: Partial<StagedBinaryRecord>): Promise<void> {
  const existing = await getRecord(id)
  if (!existing) return
  await putRecord({ ...existing, ...updates })
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

async function quarantine(id: string, errorCode: string, message: string): Promise<void> {
  await updateRecord(id, { status: 'quarantined', error: message, errorCode, updatedAt: Date.now() })
}

// ── Error classification ───────────────────────────────────────────────────

type ErrorCategory = 'retryable' | 'permanent'

function mapErrorCode(code: string | undefined): ErrorCategory {
  if (!code) return 'retryable'
  switch (code) {
    case EVIDENCE_ERROR_CODES.DEVICE_NOT_REGISTERED:
    case EVIDENCE_ERROR_CODES.DEVICE_REVOKED:
    case EVIDENCE_ERROR_CODES.LEASE_EXPIRED:
    case EVIDENCE_ERROR_CODES.LEASE_INVALID:
      return 'retryable' // can be fixed by re-registering or refreshing lease
    case EVIDENCE_ERROR_CODES.DUPLICATE_EVIDENCE_ID:
    case EVIDENCE_ERROR_CODES.HASH_MISMATCH:
    case EVIDENCE_ERROR_CODES.SIZE_MISMATCH:
    case EVIDENCE_ERROR_CODES.INVALID_CONTENT_TYPE:
    case EVIDENCE_ERROR_CODES.SIZE_EXCEEDED:
    case EVIDENCE_ERROR_CODES.CROSS_COMMAND_BINDING:
    case EVIDENCE_ERROR_CODES.OWNERSHIP_MISMATCH:
    case EVIDENCE_ERROR_CODES.BINARY_NOT_FOUND:
    case EVIDENCE_ERROR_CODES.BINARY_NOT_ACCEPTED:
      return 'permanent'
    default:
      return 'retryable'
  }
}

/**
 * Offline identity scope — binds all offline data to a specific
 * tenant + user + device combination.
 *
 * The scopeKey is a stable, deterministic string used as the
 * IndexedDB namespace prefix and queue filter.
 */

export interface OfflineIdentityScope {
  tenantId: string
  userId: string
  deviceId: string
}

export const SCOPE_KEY_SEPARATOR = ':'

/**
 * Build a deterministic scope key from identity components.
 * Format: "tenantId:userId:deviceId"
 */
export function buildScopeKey(scope: OfflineIdentityScope): string {
  return [scope.tenantId, scope.userId, scope.deviceId].join(SCOPE_KEY_SEPARATOR)
}

/**
 * Parse a scope key back into its components.
 * Returns null if the key does not contain exactly 3 parts.
 */
export function parseScopeKey(key: string): OfflineIdentityScope | null {
  const parts = key.split(SCOPE_KEY_SEPARATOR)
  if (parts.length !== 3) return null
  return {
    tenantId: parts[0],
    userId: parts[1],
    deviceId: parts[2],
  }
}

/**
 * Schema version for the offline storage format.
 * Increment when the storage layout changes and a migration is needed.
 * v3 adds the `offlineResources` store (R4 complete bootstrap resource bodies);
 * v4 (R5) layers encrypted-at-rest on top of v3: protected record payloads are
 * stored as AES-GCM-256 envelopes (iv/aad/kid/ct) and plaintext is never
 * persisted for protected records.
 */
export const OFFLINE_STORAGE_SCHEMA_VERSION = 4

/**
 * Key used to persist the schema version in IndexedDB.
 */
export const SCHEMA_VERSION_KEY = '__offline_schema_version'

/**
 * Key used to persist the current active scope in IndexedDB.
 */
export const ACTIVE_SCOPE_KEY = '__offline_active_scope'

/**
 * Quarantine store name for ambiguous legacy records
 * whose owner cannot be proven.
 */
export const QUARANTINE_STORE_NAME = 'quarantinedRecords'

// ── R5: encrypted-at-rest record envelope (schema v4) ─────────────────────

/**
 * Per-record AES-GCM-256 envelope persisted in place of the plaintext payload.
 * `iv` and `ct` are fresh per record; `aad` binds the record to
 * (scopeKey, store, kid) so forged scope/kid swaps fail GCM authentication.
 * All byte fields are base64url strings so the envelope survives IndexedDB
 * structured cloning and JSON inspection without raw plaintext.
 */
export interface EncryptedRecordEnvelope {
  v: 4
  scopeKey: string
  store: string
  kid: string
  iv: string
  aad: string
  ct: string
  at: number
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedRecordEnvelope {
  if (value === null || typeof value !== 'object') return false
  const e = value as Partial<EncryptedRecordEnvelope>
  return e.v === 4 && typeof e.scopeKey === 'string' && typeof e.store === 'string'
    && typeof e.kid === 'string' && typeof e.iv === 'string'
    && typeof e.aad === 'string' && typeof e.ct === 'string' && typeof e.at === 'number'
}

// ── R5: typed offline encryption errors (fail closed, never plaintext) ────

export const OFFLINE_ENCRYPTION_UNAVAILABLE = 'OFFLINE_ENCRYPTION_UNAVAILABLE'
export const OFFLINE_RECORD_TAMPER = 'OFFLINE_RECORD_TAMPER'
export const OFFLINE_KEY_UNAVAILABLE = 'OFFLINE_KEY_UNAVAILABLE'

export class OfflineEncryptionError extends Error {
  readonly code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'OfflineEncryptionError'
    this.code = code
  }
}

/** WebCrypto or IndexedDB CryptoKey persistence is unavailable; refuse plaintext. */
export class OfflineEncryptionUnavailableError extends OfflineEncryptionError {
  constructor(reason = OFFLINE_ENCRYPTION_UNAVAILABLE) {
    super(OFFLINE_ENCRYPTION_UNAVAILABLE, reason)
  }
}

/** Ciphertext, AAD, or payload failed AES-GCM authentication. */
export class OfflineRecordTamperError extends OfflineEncryptionError {
  constructor(detail = 'ciphertext-tamper') {
    super(OFFLINE_RECORD_TAMPER, detail)
  }
}

/** The key material needed to open a protected record is gone. */
export class OfflineKeyUnavailableError extends OfflineEncryptionError {
  constructor(detail = 'key-unavailable') {
    super(OFFLINE_KEY_UNAVAILABLE, detail)
  }
}

// ── R4: Strengthened U6 package contract (mirrors backPanel schemas/offline.schema.js) ──

/** Shared package manifest schema version (backPanel PACKAGE_SCHEMA_VERSION = 1). */
export const PACKAGE_SCHEMA_VERSION = 1

/** Seven-day lease enforced from signed claims, never local timestamps. */
export const PACKAGE_LEASE_MAX_MS = 7 * 24 * 60 * 60 * 1000

/** Resource kinds delivered by the R3 bootstrap, each persisted verbatim. */
export type PackageResourceKind = 'workOrders' | 'installations' | 'assets' | 'forms' | 'inventoryRefs'

/** Server signature over the canonical claims: ECDSA P-256/SHA-256, IEEE-P1363, base64url. */
export interface OfflineManifestSignature { alg: 'ES256'; kid: string; value: string }

/** Per-form completeness entry keyed by templateId; FORM_NOT_DELIVERED when unavailable. */
export interface OfflineFormCompleteness { available: boolean; version?: number; checksum?: string; reason?: string }

/** Claims signed by the server (the manifest minus `signature`). */
export interface OfflineManifestClaim {
  schemaVersion: number; serverTime: string; packageId: string; packageVersion: number
  deviceId: string; userId: string; tenantId: string; binding: OfflineIdentityScope
  cursor: number; expiresAt: string; revocationEpoch: number
  limits: { maxDeltaSize: number; maxPackageSizeMB: number }
  completeness: Record<string, OfflineFormCompleteness>
  /** Bucketed by kind; the backend buckets inventory refs under `inventory`. */
  resourceChecksums: Partial<Record<PackageResourceKind | 'inventory', string[]>>
}

/** Canonical signed manifest returned by prepare/refresh (bootstrap + delta base). */
export interface OfflineManifest extends OfflineManifestClaim { signature: OfflineManifestSignature }

/** Bootstrap response from POST /packages/prepare and /packages/refresh (R3 exact). */
export interface OfflineBootstrap {
  success?: boolean
  manifest: OfflineManifest
  workOrders: Array<Record<string, unknown>>
  installations: Array<Record<string, unknown>>
  assets: Array<Record<string, unknown>>
  forms: Array<Record<string, unknown>>
  inventoryRefs: Array<Record<string, unknown>>
}

/** One changelog entry from POST /packages/delta (R3 exact). */
export interface OfflineDeltaEntry {
  cursor: number; entityId: string; collection: string; operation: 'upsert' | 'delete'
  data?: unknown; reason?: string; timestamp: string
}

/** Delta response (R3 exact): ordered entries + next cursor. */
export interface OfflineDeltaResponse {
  success?: boolean; packageId: string; deviceId: string
  deltas: OfflineDeltaEntry[]; nextCursor: number; hasMore: boolean
}

// ── R9: Sync recovery state model ───────────────────────────────────────────

/** Per-item sync status visible in the OfflineSyncCenter UI. */
export type SyncItemStatus = 'pending' | 'processing' | 'conflict' | 'permanent' | 'dead-letter'

/** Error categories drive available recovery actions. */
export type SyncErrorCategory = 'network' | 'auth' | 'conflict' | 'permanent'

/** Actions available to the user for a given sync item. */
export type SyncRecoveryAction = 'retry' | 'discard' | 're-auth' | 'return-online' | 'inspect'

/** Dead-letter record — inspectable but never blind-replayed. */
export interface DeadLetterRecord {
  id: string
  originalId: string
  type: string
  payload: Record<string, unknown>
  errorCategory: SyncErrorCategory
  errorMessage: string
  failedAt: number
  retryCount: number
  scopeKey: string
  receipt?: SyncReceipt | null
}

/** Authoritative server receipt — only accepted from the backend. */
export interface SyncReceipt {
  commandId: string
  status: 'accepted' | 'rejected' | 'conflict'
  serverTimestamp: string
  details?: Record<string, unknown>
}

/** Bounded backoff state for a single queue item. */
export interface BackoffState {
  attempt: number
  nextRetryAt: number
  baseDelayMs: number
  maxDelayMs: number
}

/** Lease status derived from signed claims — never editable. */
export type LeaseStatus = 'valid' | 'expired' | 'revoked' | 'unknown'

/** Overall sync center state. */
export interface SyncCenterState {
  isOnline: boolean
  isSyncing: boolean
  leaseStatus: LeaseStatus
  pendingCount: number
  processingCount: number
  conflictCount: number
  deadLetterCount: number
  lastSyncAt: number | null
}

/** R9 backoff policy constants. */
export const BACKOFF_BASE_MS = 1000
export const BACKOFF_MAX_MS = 5 * 60 * 1000 // 5 minutes
export const BACKOFF_MAX_ATTEMPTS = 10
export const DEAD_LETTER_MAX_ATTEMPTS = 10

/**
 * Calculate the next retry delay using exponential backoff with jitter.
 * Deterministic for a given attempt + seed (testable with fake timers).
 * Returns 0 if max attempts exceeded (→ dead-letter).
 */
export function calculateBackoffDelay(attempt: number, seed?: number): number {
  if (attempt >= BACKOFF_MAX_ATTEMPTS) return 0
  const exponential = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS)
  // Deterministic jitter: 25-75% of exponential (seeded for tests)
  const jitterFactor = seed !== undefined
    ? 0.25 + (seed % 50) / 100
    : 0.25 + Math.random() * 0.5
  return Math.floor(exponential * jitterFactor)
}

/**
 * Generate a device identifier.
 * Uses a persisted random UUID stored in localStorage so it survives reloads.
 */
export function getOrCreateDeviceId(): string {
  const key = '__offline_device_id'
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    // Fallback if localStorage is unavailable
    return crypto.randomUUID()
  }
}

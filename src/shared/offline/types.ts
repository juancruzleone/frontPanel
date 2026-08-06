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
 * R5 will layer encrypted-at-rest migration on top of v3.
 */
export const OFFLINE_STORAGE_SCHEMA_VERSION = 3

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

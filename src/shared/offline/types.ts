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
 */
export const OFFLINE_STORAGE_SCHEMA_VERSION = 2

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

/** Owner-scoped offline storage — migration, quarantine, scope-aware IndexedDB wrappers. */
import { type OfflineIdentityScope, buildScopeKey, OFFLINE_STORAGE_SCHEMA_VERSION, SCHEMA_VERSION_KEY, ACTIVE_SCOPE_KEY, QUARANTINE_STORE_NAME } from './types'
export type { OfflineIdentityScope }

const DB_NAME = 'GMAO_Offline_DB'
const DB_VERSION = OFFLINE_STORAGE_SCHEMA_VERSION

/** Returns the current schema version stored in IndexedDB (1 if none stored). */
export async function getStoredSchemaVersion(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('storageMeta', 'readonly')
    const req = tx.objectStore('storageMeta').get(SCHEMA_VERSION_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result?.value ?? 1)
  })
}

export async function setStoredSchemaVersion(version: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('storageMeta', 'readwrite').objectStore('storageMeta').put({ key: SCHEMA_VERSION_KEY, value: version })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

/** Get the currently active scope from storage. */
export async function getActiveScope(): Promise<OfflineIdentityScope | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('storageMeta', 'readonly').objectStore('storageMeta').get(ACTIVE_SCOPE_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const val = req.result?.value
      resolve(val && val.tenantId && val.userId && val.deviceId ? val as OfflineIdentityScope : null)
    }
  })
}

export async function setActiveScope(scope: OfflineIdentityScope): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction('storageMeta', 'readwrite').objectStore('storageMeta').put({ key: ACTIVE_SCOPE_KEY, value: scope })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

/** Open (or upgrade) the offline IndexedDB database. */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (event.oldVersion < DB_VERSION) {
        if (!db.objectStoreNames.contains('stagedUploads')) db.createObjectStore('stagedUploads')
        if (!db.objectStoreNames.contains('storageMeta')) db.createObjectStore('storageMeta')
        if (!db.objectStoreNames.contains(QUARANTINE_STORE_NAME)) db.createObjectStore(QUARANTINE_STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Migrate v1 (unscoped) stagedUploads to v2 (scoped).
 * Proven owner → re-keyed. Missing/different owner → quarantined. Never auto-replayed.
 */
export async function migrateBinaryStorage(activeScope: OfflineIdentityScope): Promise<{ migrated: number; quarantined: number }> {
  const db = await openDB()
  const scopeKey = buildScopeKey(activeScope)
  let migrated = 0
  let quarantined = 0
  return new Promise((resolve, reject) => {
    const readTx = db.transaction('stagedUploads', 'readonly')
    const readStore = readTx.objectStore('stagedUploads')
    const getAllReq = readStore.getAll()
    const getAllKeysReq = readStore.getAllKeys()
    getAllReq.onerror = () => reject(getAllReq.error)
    getAllKeysReq.onerror = () => reject(getAllKeysReq.error)
    let allRecords: any[] = []
    let allKeys: IDBValidKey[] = []
    getAllReq.onsuccess = () => { allRecords = getAllReq.result || [] }
    getAllKeysReq.onsuccess = () => { allKeys = getAllKeysReq.result || [] }
    readTx.oncomplete = () => {
      const writeTx = db.transaction(['stagedUploads', QUARANTINE_STORE_NAME], 'readwrite')
      const writeStore = writeTx.objectStore('stagedUploads')
      const quarantineStore = writeTx.objectStore(QUARANTINE_STORE_NAME)
      for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i]
        const key = String(allKeys[i])
        if (record.ownerScope && record.ownerScope.tenantId === activeScope.tenantId && record.ownerScope.userId === activeScope.userId) {
          if (!key.startsWith(`${scopeKey}:`)) {
            writeStore.put({ ...record, ownerScope: activeScope }, `${scopeKey}:${key}`)
            writeStore.delete(key)
          }
          migrated++
        } else {
          quarantineStore.put({ id: key, record, quarantinedAt: Date.now(), reason: record.ownerScope ? 'owner-mismatch' : 'missing-owner' })
          writeStore.delete(key)
          quarantined++
        }
      }
      writeTx.onerror = () => reject(writeTx.error)
      writeTx.oncomplete = () => resolve({ migrated, quarantined })
    }
  })
}

/** Purge all offline data for a given scope. Called on logout/switch. */
export async function purgeScopeData(scopeToPurge: OfflineIdentityScope): Promise<{ purgedBinaries: number; purgedQueue: number }> {
  const db = await openDB()
  const scopeKey = buildScopeKey(scopeToPurge)
  let purgedBinaries = 0
  const purgedQueue = 0
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['stagedUploads', 'storageMeta'], 'readwrite')
    const binaryStore = tx.objectStore('stagedUploads')
    const metaStore = tx.objectStore('storageMeta')
    const cursorReq = binaryStore.openCursor()
    cursorReq.onerror = () => reject(cursorReq.error)
    cursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if (String(cursor.key).startsWith(`${scopeKey}:`)) { cursor.delete(); purgedBinaries++ }
        cursor.continue()
      }
    }
    const getScopeReq = metaStore.get(ACTIVE_SCOPE_KEY)
    getScopeReq.onsuccess = () => {
      const active = getScopeReq.result?.value
      if (active && active.tenantId === scopeToPurge.tenantId && active.userId === scopeToPurge.userId && active.deviceId === scopeToPurge.deviceId) {
        metaStore.delete(ACTIVE_SCOPE_KEY)
      }
    }
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve({ purgedBinaries, purgedQueue })
  })
}

export async function getQuarantineCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(QUARANTINE_STORE_NAME, 'readonly').objectStore(QUARANTINE_STORE_NAME).count()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

export async function getQuarantinedRecords(): Promise<Array<{ id: string; record: Record<string, unknown>; quarantinedAt: number; reason: string }>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(QUARANTINE_STORE_NAME, 'readonly').objectStore(QUARANTINE_STORE_NAME).getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result || [])
  })
}

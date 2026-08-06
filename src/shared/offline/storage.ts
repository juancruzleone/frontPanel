/** Owner-scoped offline storage — migration, quarantine, scope-aware IndexedDB wrappers. */
import {
  type OfflineIdentityScope, buildScopeKey, OFFLINE_STORAGE_SCHEMA_VERSION, SCHEMA_VERSION_KEY, ACTIVE_SCOPE_KEY,
  QUARANTINE_STORE_NAME, type OfflineManifest, type PackageResourceKind,
} from './types'
export type { OfflineIdentityScope }

const DB_NAME = 'GMAO_Offline_DB'
const DB_VERSION = OFFLINE_STORAGE_SCHEMA_VERSION

// R4 — package + resource records live in this DB
export const PACKAGES_STORE = 'offlinePackages'
export const PROGRESS_STORE = 'downloadProgress'
export const RESOURCES_STORE = 'offlineResources'

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
        if (!db.objectStoreNames.contains(PACKAGES_STORE)) db.createObjectStore(PACKAGES_STORE, { keyPath: 'packageId' })
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) db.createObjectStore(PROGRESS_STORE, { keyPath: 'packageId' })
        if (!db.objectStoreNames.contains(RESOURCES_STORE)) db.createObjectStore(RESOURCES_STORE, { keyPath: 'id' })
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

// ── R4: verified package + resource persistence (complete bodies, tenant+user+device) ──

export interface StoredResourceRecord {
  id: string // `${scopeKey}:${kind}:${resourceId}`
  scopeKey: string
  packageId: string
  kind: PackageResourceKind
  resourceId: string
  body: Record<string, unknown>
  version?: number
  checksum?: string
  verified: boolean
  deliveredAt: number
}

export interface StoredPackageRecord {
  packageId: string
  manifest: OfflineManifest
  cursor: number
  version: number
  ready: boolean
  downloadedAt: number
  lastSyncedAt: number
  freshness: 'fresh' | 'stale' | 'expired'
  ownerScope: OfflineIdentityScope
}

export interface DownloadProgressRecord {
  packageId: string; totalResources: number; completedResources: number; failedResources: number
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'error' | 'quota_exceeded'; lastError?: string; startedAt: number; updatedAt: number
}

export const resourceRecordId = (scopeKey: string, kind: PackageResourceKind, resourceId: string): string =>
  `${scopeKey}:${kind}:${resourceId}`

function withStore<T>(storeName: string, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const req = op(db.transaction(storeName, mode).objectStore(storeName))
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve((req.result ?? null) as T)
  }))
}

export const getPackageRecord = (packageId: string) => withStore<StoredPackageRecord | undefined>(PACKAGES_STORE, 'readonly', s => s.get(packageId))
export const putPackageRecord = (pkg: StoredPackageRecord) => withStore<void>(PACKAGES_STORE, 'readwrite', s => s.put(pkg, pkg.packageId))
export const deletePackageRecord = (packageId: string) => withStore<void>(PACKAGES_STORE, 'readwrite', s => s.delete(packageId))
export const getAllPackageRecords = () => withStore<StoredPackageRecord[]>(PACKAGES_STORE, 'readonly', s => s.getAll())
export const getProgressRecord = (packageId: string) => withStore<DownloadProgressRecord | undefined>(PROGRESS_STORE, 'readonly', s => s.get(packageId))
export const putProgressRecord = (p: DownloadProgressRecord) => withStore<void>(PROGRESS_STORE, 'readwrite', s => s.put(p, p.packageId))
export const deleteProgressRecord = (packageId: string) => withStore<void>(PROGRESS_STORE, 'readwrite', s => s.delete(packageId))

export async function getResourceRecordsForScope(scopeKey: string): Promise<StoredResourceRecord[]> {
  const all = await withStore<StoredResourceRecord[]>(RESOURCES_STORE, 'readonly', s => s.getAll())
  return (all || []).filter(r => r.scopeKey === scopeKey)
}

export async function getResourceCountsForScope(scopeKey: string): Promise<Partial<Record<PackageResourceKind, number>>> {
  const records = await getResourceRecordsForScope(scopeKey)
  return records.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] ?? 0) + 1; return acc }, {} as Partial<Record<PackageResourceKind, number>>)
}

/** Delete resource records for a scope, optionally restricted to one package. */
export async function deleteResources(scopeKey: string, packageId?: string): Promise<number> {
  const records = (await getResourceRecordsForScope(scopeKey)).filter(r => !packageId || r.packageId === packageId)
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESOURCES_STORE, 'readwrite')
    const store = tx.objectStore(RESOURCES_STORE)
    for (const r of records) store.delete(r.id)
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve(records.length)
  })
}

/**
 * Atomic readiness: package record, progress, and every verified resource are
 * written in ONE readwrite transaction — a package is only marked ready after
 * manifest, signature, checksums and all resources verify; otherwise nothing
 * is persisted.
 */
export async function persistPackageBundle(bundle: { scopeKey: string; pkg: StoredPackageRecord; resources: StoredResourceRecord[]; progress: DownloadProgressRecord }): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RESOURCES_STORE, PACKAGES_STORE, PROGRESS_STORE], 'readwrite')
    const resourcesStore = tx.objectStore(RESOURCES_STORE)
    for (const r of bundle.resources) resourcesStore.put(r)
    tx.objectStore(PACKAGES_STORE).put(bundle.pkg, bundle.pkg.packageId)
    tx.objectStore(PROGRESS_STORE).put(bundle.progress, bundle.progress.packageId)
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve()
  })
}

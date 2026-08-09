/** Owner-scoped offline storage — migration, quarantine, scope-aware IndexedDB wrappers. */
import {
  type OfflineIdentityScope, buildScopeKey, OFFLINE_STORAGE_SCHEMA_VERSION, SCHEMA_VERSION_KEY, ACTIVE_SCOPE_KEY,
  QUARANTINE_STORE_NAME, type OfflineManifest, type PackageResourceKind,
  type EncryptedRecordEnvelope, isEncryptedEnvelope,
  OfflineEncryptionUnavailableError, OfflineRecordTamperError, OfflineKeyUnavailableError,
} from './types'
import {
  generateStorageKey, encryptRecordPayload, decryptRecordPayload, buildRecordAad,
  base64UrlEncode, base64UrlToBytes,
} from './crypto'
export type { OfflineIdentityScope }

const DB_NAME = 'GMAO_Offline_DB'
const DB_VERSION = OFFLINE_STORAGE_SCHEMA_VERSION

// R4 — package + resource records live in this DB
export const PACKAGES_STORE = 'offlinePackages'
export const PROGRESS_STORE = 'downloadProgress'
export const RESOURCES_STORE = 'offlineResources'
// R5 — non-extractable AES-GCM CryptoKey handles (never raw material)
export const STORAGE_KEYS_STORE = 'storageKeys'

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
        if (!db.objectStoreNames.contains(STORAGE_KEYS_STORE)) db.createObjectStore(STORAGE_KEYS_STORE, { keyPath: 'id' })
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

// ── R5: encrypted-at-rest (schema v4) — keys, envelopes, migration, purge ──
/**
 * Persisted storage-key record. Only the non-extractable CryptoKey handle is
 * stored — never raw key material. `retired` keeps old handles after rotation
 * so records encrypted under a previous `kid` stay readable (overlap).
 */
export interface StoredStorageKey {
  id: string // scopeKey
  kid: string // current key version, e.g. 'enc-1'
  key: CryptoKey
  keyVersion: number
  createdAt: number
  retired: Array<{ kid: string; key: CryptoKey }>
}

export type EncryptedMigrationResult =
  | { status: 'migrated'; migrated: number; quarantined: number; fromSchema: number }
  | { status: 'already-v4'; fromSchema: number }
  | { status: 'unsupported'; reason: string; fromSchema: number }

export interface PurgeResult { purgedRecords: number; destroyedKeys: number; activeScopeCleared: boolean }

/** Synchronous capability check: WebCrypto AES-GCM and IndexedDB must exist. */
export function isEncryptionAvailable(): boolean {
  const subtle = globalThis.crypto?.subtle
  return typeof subtle?.generateKey === 'function' && typeof subtle?.encrypt === 'function'
    && typeof subtle?.decrypt === 'function' && typeof globalThis.indexedDB !== 'undefined'
}

const getStoredStorageKeyRecord = (scopeKey: string) =>
  withStore<StoredStorageKey | undefined>(STORAGE_KEYS_STORE, 'readonly', (s) => s.get(scopeKey)).then((v) => v ?? null)
export const getStoredStorageKey = getStoredStorageKeyRecord
const putStoredStorageKey = (record: StoredStorageKey) =>
  withStore<void>(STORAGE_KEYS_STORE, 'readwrite', (s) => s.put(record, record.id))
const deleteStoredStorageKey = (scopeKey: string) =>
  withStore<void>(STORAGE_KEYS_STORE, 'readwrite', (s) => s.delete(scopeKey))

/**
 * Get (or lazily create) the scope's non-extractable AES-GCM key handle.
 * Creation self-validates IndexedDB CryptoKey persistence: if the handle does
 * not survive the write/read-back round trip, we fail closed with a typed
 * error and never fall back to plaintext.
 */
export async function getOrCreateStorageKey(scopeKey: string): Promise<{ key: CryptoKey; kid: string; created: boolean }> {
  if (!isEncryptionAvailable()) throw new OfflineEncryptionUnavailableError('webcrypto-unavailable')
  const existing = await getStoredStorageKey(scopeKey)
  if (existing?.key instanceof CryptoKey) return { key: existing.key, kid: existing.kid, created: false }
  if (existing) {
    // A record exists but the handle was not preserved (structured clone refused).
    await deleteStoredStorageKey(scopeKey)
    throw new OfflineEncryptionUnavailableError('crypto-key-persistence-unavailable')
  }
  const key = await generateStorageKey()
  const record: StoredStorageKey = { id: scopeKey, kid: 'enc-1', key, keyVersion: 1, createdAt: Date.now(), retired: [] }
  try { await putStoredStorageKey(record) } catch (error) {
    if (!isCloneRefused(error)) throw error
    throw new OfflineEncryptionUnavailableError('crypto-key-persistence-unavailable')
  }
  const check = await getStoredStorageKey(scopeKey)
  if (!check || !(check.key instanceof CryptoKey)) {
    await deleteStoredStorageKey(scopeKey)
    throw new OfflineEncryptionUnavailableError('crypto-key-persistence-unavailable')
  }
  return { key, kid: record.kid, created: true }
}

/** True when the error indicates structured-clone refused the CryptoKey handle. */
function isCloneRefused(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'DataCloneError' || error.name === 'AbortError')
}

/** Rotate to a fresh key under the next kid; the current handle stays retired for old records. */
export async function rotateStorageKey(scopeKey: string): Promise<{ key: CryptoKey; kid: string }> {
  const existing = await getStoredStorageKey(scopeKey)
  if (!existing) throw new OfflineKeyUnavailableError('no-key')
  const keyVersion = existing.keyVersion + 1
  const kid = `enc-${keyVersion}`
  const key = await generateStorageKey()
  const record: StoredStorageKey = {
    id: scopeKey, kid, key, keyVersion, createdAt: existing.createdAt,
    retired: [...existing.retired, ...(existing.key ? [{ kid: existing.kid, key: existing.key }] : [])],
  }
  await putStoredStorageKey(record)
  return { key, kid }
}

/** Look up the handle for a specific kid (current or retired). */
export async function getStorageKeyForKid(scopeKey: string, kid: string): Promise<CryptoKey | null> {
  const record = await getStoredStorageKey(scopeKey)
  if (!record) return null
  if (record.kid === kid) return record.key
  return record.retired.find((r) => r.kid === kid)?.key ?? null
}

/** Build an at-rest envelope for a payload (fresh IV, AAD bound to scope+store+kid). */
export async function encryptPayload(scopeKey: string, store: string, kid: string, key: CryptoKey, payload: Uint8Array): Promise<EncryptedRecordEnvelope> {
  const aad = buildRecordAad(scopeKey, store, kid)
  const { iv, ciphertext } = await encryptRecordPayload(key, payload, aad)
  return { v: 4, scopeKey, store, kid, iv: base64UrlEncode(iv), aad: base64UrlEncode(aad), ct: base64UrlEncode(ciphertext), at: Date.now() }
}

/**
 * Open an envelope with the given key. Recomputes the AAD from the envelope's
 * (scopeKey, store, kid) and rejects any mismatch or GCM authentication
 * failure as tamper — a wrong key, swapped scope, or swapped kid never opens.
 */
export async function decryptPayload(key: CryptoKey, envelope: EncryptedRecordEnvelope): Promise<Uint8Array> {
  const expectedAad = buildRecordAad(envelope.scopeKey, envelope.store, envelope.kid)
  if (base64UrlEncode(expectedAad) !== envelope.aad) throw new OfflineRecordTamperError('aad-mismatch')
  try {
    return await decryptRecordPayload(key, base64UrlToBytes(envelope.ct), expectedAad, base64UrlToBytes(envelope.iv))
  } catch { throw new OfflineRecordTamperError('ciphertext-tamper') }
}

/**
 * v3→v4 migration: re-encrypt only records whose owner scope is provable;
 * ambiguous/legacy records are quarantined and never auto-replayed. Runs in a
 * single readwrite transaction (atomic) and reports already-v4 on reruns
 * (idempotent). When WebCrypto or CryptoKey persistence is unavailable it
 * returns a typed `unsupported` result and leaves data untouched — the caller
 * must keep the store read-only rather than fall back to plaintext.
 */
export async function migrateEncryptedStorage(activeScope: OfflineIdentityScope): Promise<EncryptedMigrationResult> {
  const fromSchema = await getStoredSchemaVersion()
  if (fromSchema >= OFFLINE_STORAGE_SCHEMA_VERSION) return { status: 'already-v4', fromSchema }
  if (!isEncryptionAvailable()) return { status: 'unsupported', reason: 'webcrypto-unavailable', fromSchema }
  const scopeKey = buildScopeKey(activeScope)
  let keyInfo: { key: CryptoKey; kid: string }
  try { keyInfo = await getOrCreateStorageKey(scopeKey) } catch (error) {
    if (error instanceof OfflineEncryptionUnavailableError) return { status: 'unsupported', reason: error.message, fromSchema }
    throw error
  }
  const db = await openDB()
  const resources = await withStore<StoredResourceRecordRaw[]>(RESOURCES_STORE, 'readonly', (s) => s.getAll()).catch(() => [])
  const packages = await withStore<StoredPackageRecord[]>(PACKAGES_STORE, 'readonly', (s) => s.getAll()).catch(() => [])

  let migrated = 0
  let quarantined = 0
  const resourceWrites: Array<StoredResourceRecordRaw> = []
  const resourceDeletes: string[] = []
  const packageDeletes: string[] = []
  const quarantineWrites: Array<{ id: string; record: unknown; reason: string }> = []

  for (const r of resources ?? []) {
    if (r.scopeKey === scopeKey) {
      if (!isEncryptedEnvelope(r.body)) {
        const envelope = await encryptPayload(scopeKey, RESOURCES_STORE, keyInfo.kid, keyInfo.key, new TextEncoder().encode(JSON.stringify(r.body)))
        resourceWrites.push({ ...r, body: envelope, encrypted: true })
      } else {
        resourceWrites.push(r) // already encrypted (write path ran before migration)
      }
      migrated++
    } else {
      quarantineWrites.push({ id: r.id, record: r, reason: r.scopeKey ? 'owner-mismatch' : 'owner-unprovable' })
      resourceDeletes.push(r.id)
      quarantined++
    }
  }
  for (const p of packages ?? []) {
    if (!p || !p.packageId) continue
    if (p.ownerScope && buildScopeKey(p.ownerScope) === scopeKey) continue // signed manifest, not encrypted
    quarantineWrites.push({ id: p.packageId, record: p, reason: p.ownerScope ? 'owner-mismatch' : 'owner-unprovable' })
    packageDeletes.push(p.packageId)
    quarantined++
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([RESOURCES_STORE, PACKAGES_STORE, QUARANTINE_STORE_NAME, 'storageMeta'], 'readwrite')
    const resourcesStore = tx.objectStore(RESOURCES_STORE)
    for (const w of resourceWrites) resourcesStore.put(w)
    for (const id of resourceDeletes) resourcesStore.delete(id)
    const packagesStore = tx.objectStore(PACKAGES_STORE)
    for (const id of packageDeletes) packagesStore.delete(id)
    const quarantineStore = tx.objectStore(QUARANTINE_STORE_NAME)
    for (const q of quarantineWrites) quarantineStore.put({ id: q.id, record: q.record, quarantinedAt: Date.now(), reason: q.reason })
    tx.objectStore('storageMeta').put({ key: SCHEMA_VERSION_KEY, value: OFFLINE_STORAGE_SCHEMA_VERSION })
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve({ status: 'migrated', migrated, quarantined, fromSchema })
  })
}

/** True when the offline store has been migrated to the encrypted schema. */
export async function isStorageEncrypted(): Promise<boolean> {
  return (await getStoredSchemaVersion()) >= OFFLINE_STORAGE_SCHEMA_VERSION
}

/**
 * Verified purge: destroy the scope's key handle(s) and every protected record
 * in one awaited transaction BEFORE another identity can open the app.
 * Fire-and-forget is insufficient — callers must await this result.
 */
export async function purgeEncryptedScope(scope: OfflineIdentityScope): Promise<PurgeResult> {
  const scopeKey = buildScopeKey(scope)
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RESOURCES_STORE, PACKAGES_STORE, 'stagedUploads', 'storageMeta', STORAGE_KEYS_STORE], 'readwrite')
    let purgedRecords = 0
    let destroyedKeys = 0
    let activeScopeCleared = false

    const resourcesStore = tx.objectStore(RESOURCES_STORE)
    const rReq = resourcesStore.getAll()
    rReq.onerror = () => reject(rReq.error)
    rReq.onsuccess = () => {
      for (const r of rReq.result ?? []) {
        if (r.scopeKey === scopeKey) { resourcesStore.delete(r.id); purgedRecords++ }
      }
    }
    const packagesStore = tx.objectStore(PACKAGES_STORE)
    const pReq = packagesStore.getAll()
    pReq.onerror = () => reject(pReq.error)
    pReq.onsuccess = () => {
      for (const p of pReq.result ?? []) {
        if (p?.ownerScope && buildScopeKey(p.ownerScope) === scopeKey) { packagesStore.delete(p.packageId); purgedRecords++ }
      }
    }
    const stagedStore = tx.objectStore('stagedUploads')
    const sReq = stagedStore.getAllKeys()
    sReq.onerror = () => reject(sReq.error)
    sReq.onsuccess = () => {
      for (const k of sReq.result ?? []) {
        if (String(k).startsWith(`${scopeKey}:`)) { stagedStore.delete(k); purgedRecords++ }
      }
    }
    const keyStore = tx.objectStore(STORAGE_KEYS_STORE)
    const kReq = keyStore.get(scopeKey)
    kReq.onerror = () => reject(kReq.error)
    kReq.onsuccess = () => {
      if (kReq.result) { keyStore.delete(scopeKey); destroyedKeys++ }
    }
    const metaStore = tx.objectStore('storageMeta')
    const mReq = metaStore.get(ACTIVE_SCOPE_KEY)
    mReq.onerror = () => reject(mReq.error)
    mReq.onsuccess = () => {
      const active = mReq.result?.value
      if (active && active.tenantId === scope.tenantId && active.userId === scope.userId && active.deviceId === scope.deviceId) {
        metaStore.delete(ACTIVE_SCOPE_KEY)
        activeScopeCleared = true
      }
    }
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve({ purgedRecords, destroyedKeys, activeScopeCleared })
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
  /** Set when the body is stored as an encrypted envelope (schema v4). */
  encrypted?: boolean
}

/** Storage shape: the body is either plaintext (pre-v4) or an encrypted envelope (v4). */
export type StoredResourceRecordRaw = Omit<StoredResourceRecord, 'body'> & { body: Record<string, unknown> | EncryptedRecordEnvelope }

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

export const getAllResourceRecordsRaw = () => withStore<StoredResourceRecordRaw[]>(RESOURCES_STORE, 'readonly', (s) => s.getAll())

async function decryptStoredRecordBody(keyRecord: StoredStorageKey | null, body: Record<string, unknown> | EncryptedRecordEnvelope): Promise<Record<string, unknown>> {
  if (!isEncryptedEnvelope(body)) return body as Record<string, unknown> // pre-v4 plaintext (migration not yet run)
  const envelope = body
  if (!keyRecord) throw new OfflineKeyUnavailableError('key-destroyed')
  const key = keyRecord.kid === envelope.kid ? keyRecord.key : keyRecord.retired.find((r) => r.kid === envelope.kid)?.key
  if (!key) throw new OfflineKeyUnavailableError('kid-unknown')
  const plain = await decryptPayload(key, envelope)
  try { return JSON.parse(new TextDecoder().decode(plain)) as Record<string, unknown> }
  catch { throw new OfflineRecordTamperError('payload-malformed') }
}

/** Decrypted resource records for a scope. Fails closed (typed) on tamper or missing key. */
export async function getResourceRecordsForScope(scopeKey: string): Promise<StoredResourceRecord[]> {
  const raw = await withStore<StoredResourceRecordRaw[]>(RESOURCES_STORE, 'readonly', (s) => s.getAll())
  const records = (raw ?? []).filter((r) => r.scopeKey === scopeKey)
  const keyRecord = await getStoredStorageKey(scopeKey)
  const out: StoredResourceRecord[] = []
  for (const r of records) {
    out.push({ ...r, body: await decryptStoredRecordBody(keyRecord, r.body) })
  }
  return out
}

export async function getResourceCountsForScope(scopeKey: string): Promise<Partial<Record<PackageResourceKind, number>>> {
  const records = await getResourceRecordsForScope(scopeKey)
  return records.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] ?? 0) + 1; return acc }, {} as Partial<Record<PackageResourceKind, number>>)
}

/** Delete resource records for a scope, optionally restricted to one package. */
export async function deleteResources(scopeKey: string, packageId?: string): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESOURCES_STORE, 'readwrite')
    const store = tx.objectStore(RESOURCES_STORE)
    const req = store.getAll()
    let count = 0
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      for (const r of req.result ?? []) {
        if (r.scopeKey === scopeKey && (!packageId || r.packageId === packageId)) { store.delete(r.id); count++ }
      }
    }
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve(count)
  })
}

/**
 * Atomic readiness: package record, progress, and every verified resource are
 * written in ONE readwrite transaction — a package is only marked ready after
 * manifest, signature, checksums and all resources verify; otherwise nothing
 * is persisted. Resource bodies are encrypted at rest (AES-GCM envelope)
 * before they touch IndexedDB; plaintext is never persisted.
 */
export async function persistPackageBundle(bundle: { scopeKey: string; pkg: StoredPackageRecord; resources: StoredResourceRecord[]; progress: DownloadProgressRecord }): Promise<void> {
  const keyInfo = await getOrCreateStorageKey(bundle.scopeKey)
  const encryptedResources: StoredResourceRecordRaw[] = []
  for (const r of bundle.resources) {
    const envelope = await encryptPayload(bundle.scopeKey, RESOURCES_STORE, keyInfo.kid, keyInfo.key, new TextEncoder().encode(JSON.stringify(r.body)))
    encryptedResources.push({ ...r, body: envelope, encrypted: true })
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RESOURCES_STORE, PACKAGES_STORE, PROGRESS_STORE], 'readwrite')
    const resourcesStore = tx.objectStore(RESOURCES_STORE)
    for (const r of encryptedResources) resourcesStore.put(r)
    tx.objectStore(PACKAGES_STORE).put(bundle.pkg, bundle.pkg.packageId)
    tx.objectStore(PROGRESS_STORE).put(bundle.progress, bundle.progress.packageId)
    tx.onerror = () => reject(tx.error)
    tx.oncomplete = () => resolve()
  })
}

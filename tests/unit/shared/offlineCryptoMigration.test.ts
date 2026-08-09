/**
 * R5 — Encrypted IndexedDB migration (RED-first). AES-GCM-256 per-record
 * encryption (fresh IV, AAD scope binding), non-extractable CryptoKey handles
 * with key-version rotation, v3→v4 migration (proven owners re-encrypted,
 * ambiguous quarantined, atomic + idempotent), verified purge that makes data
 * irrecoverable before identity reuse, typed unsupported-platform fallback
 * (never plaintext), and cross-scope rejection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildScopeKey, OFFLINE_STORAGE_SCHEMA_VERSION, type OfflineIdentityScope,
  type EncryptedRecordEnvelope, isEncryptedEnvelope,
  OfflineEncryptionUnavailableError, OfflineRecordTamperError,
} from '../../../src/shared/offline/types'
import {
  generateStorageKey, importStorageKey, encryptRecordPayload, decryptRecordPayload,
  buildRecordAad, base64UrlEncode,
} from '../../../src/shared/offline/crypto'
import {
  getOrCreateStorageKey, getStoredStorageKey, rotateStorageKey, getStorageKeyForKid,
  encryptPayload, decryptPayload, migrateEncryptedStorage, purgeEncryptedScope,
  isEncryptionAvailable, isStorageEncrypted, getResourceRecordsForScope,
  persistPackageBundle, getAllResourceRecordsRaw,
  getQuarantineCount, getQuarantinedRecords, getStoredSchemaVersion, getActiveScope, setActiveScope,
  RESOURCES_STORE, PACKAGES_STORE,
} from '../../../src/shared/offline/storage'

// ── In-memory IndexedDB mock (upgrades, multi-store txs, failure hooks) ──
const DB_NAME = 'GMAO_Offline_DB'

function mkReq(result?: unknown, error?: Error) {
  const req: any = { onsuccess: null, onerror: null, result, error }
  if (error) { queueMicrotask(() => req.onerror?.({ target: req })) } else { queueMicrotask(() => req.onsuccess?.({ target: req })) }
  return req
}
function createStore() {
  const data = new Map<string, any>()
  return {
    _data: data,
    put(val: any, key?: string) { const k = key ?? val?.id ?? val?.key ?? val?.packageId ?? String(Date.now()); data.set(k, val); return mkReq(k) },
    get(key: string) { return mkReq(data.get(key) ?? undefined) },
    delete(key: string) { data.delete(key); return mkReq(undefined) },
    getAll() { return mkReq(Array.from(data.values())) },
    getAllKeys() { return mkReq(Array.from(data.keys())) },
    count() { return mkReq(data.size) },
  }
}
function createDB() {
  const stores = new Map<string, ReturnType<typeof createStore>>()
  return {
    _version: 0,
    _stores: stores,
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore(name: string) { const store = createStore(); stores.set(name, store); return store },
    transaction(_storeNames: string | string[]) {
      const tx: any = { oncomplete: null, onerror: null, _errored: false, error: undefined }
      tx.objectStore = (name: string) => {
        if (!stores.has(name)) stores.set(name, createStore())
        const store = stores.get(name)!
        return {
          put(val: any, key?: string) {
            if (tx._errored) return mkReq(undefined) // aborted transaction: later ops are no-ops
            if (name === 'storageKeys' && hooks.refuseCryptoKey && (val instanceof CryptoKey || val?.key instanceof CryptoKey)) {
              tx._errored = true; tx.error = new DOMException('DataCloneError', 'DataCloneError')
              return mkReq(undefined, tx.error)
            }
            const pending = hooks.pendingFailures.get(name)
            if (pending && pending > 0) { hooks.pendingFailures.set(name, pending - 1); tx._errored = true; tx.error = new Error('quota-exceeded'); return mkReq(undefined, tx.error) }
            return store.put(val, key)
          },
          get: (key: string) => store.get(key),
          delete: (key: string) => { if (tx._errored) return mkReq(undefined); return store.delete(key) },
          getAll: () => store.getAll(),
          getAllKeys: () => store.getAllKeys(),
          count: () => store.count(),
        }
      }
      setTimeout(() => {
        if (tx._errored) tx.onerror?.({ target: tx })
        else tx.oncomplete?.({ target: tx })
      }, 0)
      return tx
    },
    close() {},
  }
}
const dbInstances = new Map<string, ReturnType<typeof createDB>>()
const hooks = { refuseCryptoKey: false, pendingFailures: new Map<string, number>() }
const idbMock = {
  open(name: string, version = 1) {
    if (!dbInstances.has(name)) dbInstances.set(name, createDB())
    const db = dbInstances.get(name)!
    const oldVersion = db._version
    const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, result: db }
    queueMicrotask(() => {
      if (version > oldVersion) {
        req.onupgradeneeded?.({ target: req, oldVersion })
        db._version = version
      }
      req.onsuccess?.({ target: req })
    })
    return req
  },
  _clear() { dbInstances.clear(); hooks.pendingFailures.clear(); hooks.refuseCryptoKey = false },
  _getStore(dbName: string, storeName: string) {
    if (!dbInstances.has(dbName)) dbInstances.set(dbName, createDB())
    const db = dbInstances.get(dbName)!
    if (!db._stores.has(storeName)) db._stores.set(storeName, createStore())
    return db._stores.get(storeName)
  },
  _failNextPut(storeName: string) { hooks.pendingFailures.set(storeName, (hooks.pendingFailures.get(storeName) ?? 0) + 1) },
  _refuseKeyPersistence(flag: boolean) { hooks.refuseCryptoKey = flag },
}
vi.stubGlobal('indexedDB', idbMock)

// ── Fixtures ─────────────────────────────────────────────────────────────
const scopeA: OfflineIdentityScope = { tenantId: 'tenant-1', userId: 'user-a', deviceId: 'device-001' }
const scopeB: OfflineIdentityScope = { tenantId: 'tenant-1', userId: 'user-b', deviceId: 'device-002' }
const scopeKeyA = buildScopeKey(scopeA)
const scopeKeyB = buildScopeKey(scopeB)
const payloadOf = (body: Record<string, unknown>) => new TextEncoder().encode(JSON.stringify(body))
const textOf = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
// Flip the FIRST base64url char: it always carries real bytes, so the tamper is deterministic
const mutateCt = (s: string) => (s.startsWith('A') ? `B${s.slice(1)}` : `A${s.slice(1)}`)
// Flip the last char of the AAD tag string: the equality check is string-level, so any change rejects
const mutateAad = (s: string) => (s.endsWith('A') ? `${s.slice(0, -1)}B` : `${s.slice(0, -1)}A`)
const rawKeyForTest = () => new Uint8Array(32).map((_, i) => (i * 7) % 256)
function seedResource(scopeKey: string, id: string, kind: string, body: Record<string, unknown>) {
  idbMock._getStore(DB_NAME, RESOURCES_STORE).put(
    { id, scopeKey, packageId: 'pkg-1', kind, resourceId: id.split(':').pop(), body, verified: true, deliveredAt: 1 }, id)
}
function progressFixture(total = 1) {
  return { packageId: 'pkg-1', totalResources: total, completedResources: total, failedResources: 0, status: 'completed' as const, startedAt: 1, updatedAt: 1 }
}
function pkgRecordFixture(ownerScope: OfflineIdentityScope) {
  return {
    packageId: 'pkg-1', manifest: { packageId: 'pkg-1', expiresAt: new Date(Date.now() + 864e5).toISOString() } as never,
    cursor: 5, version: 1, ready: true, downloadedAt: 1, lastSyncedAt: 1, freshness: 'fresh' as const, ownerScope,
  }
}
function resourceFixture(id: string, body: Record<string, unknown>) {
  return { id, scopeKey: scopeKeyA, packageId: 'pkg-1', kind: 'workOrders' as const, resourceId: 'o1', body, verified: true, deliveredAt: 1 }
}

beforeEach(() => { idbMock._clear(); localStorage.clear() })

describe('R5 — AES-GCM round-trip with fresh IV and AAD scope binding', () => {
  it('encrypts the same payload into different IV/ciphertext each time and decrypts back', async () => {
    const key = await generateStorageKey()
    const aad = buildRecordAad(scopeKeyA, RESOURCES_STORE, 'enc-1')
    const payload = payloadOf({ _id: 'o1', estado: 'asignada' })
    const first = await encryptRecordPayload(key, payload, aad)
    const second = await encryptRecordPayload(key, payload, aad)
    expect(base64UrlEncode(first.iv)).not.toBe(base64UrlEncode(second.iv))
    expect(base64UrlEncode(first.ciphertext)).not.toBe(base64UrlEncode(second.ciphertext))
    const plain = await decryptRecordPayload(key, first.ciphertext, aad, first.iv)
    expect(JSON.parse(textOf(plain))).toEqual({ _id: 'o1', estado: 'asignada' })
    // raw-import path produces a 32-byte AES-256 handle (rotation/import support)
    const imported = await importStorageKey(rawKeyForTest(), true)
    expect(new Uint8Array(await crypto.subtle.exportKey('raw', imported)).length).toBe(32)
  })
})

describe('R5 — tamper rejection (ciphertext / AAD / kid)', () => {
  it('rejects tampered ciphertext, tampered AAD tag, swapped kid, and swapped scope binding', async () => {
    const key = await generateStorageKey()
    const kid = 'enc-1'
    const envelope = await encryptPayload(scopeKeyA, RESOURCES_STORE, kid, key, payloadOf({ _id: 'o1' }))
    const base = { ...envelope }
    await expect(decryptPayload(key, { ...base, ct: mutateCt(base.ct) })).rejects.toBeInstanceOf(OfflineRecordTamperError)
    await expect(decryptPayload(key, { ...base, aad: mutateAad(base.aad) })).rejects.toBeInstanceOf(OfflineRecordTamperError)
    await expect(decryptPayload(key, { ...base, kid: 'enc-9', aad: base64UrlEncode(buildRecordAad(scopeKeyA, RESOURCES_STORE, 'enc-9')) })).rejects.toBeInstanceOf(OfflineRecordTamperError)
    await expect(decryptPayload(key, { ...base, scopeKey: scopeKeyB, aad: base64UrlEncode(buildRecordAad(scopeKeyB, RESOURCES_STORE, kid)) })).rejects.toBeInstanceOf(OfflineRecordTamperError)
  })
  it('storage read fails closed (typed) when the persisted envelope is tampered', async () => {
    await getOrCreateStorageKey(scopeKeyA)
    await persistPackageBundle({ scopeKey: scopeKeyA, pkg: pkgRecordFixture(scopeA), progress: progressFixture(1), resources: [resourceFixture(`${scopeKeyA}:workOrders:o1`, { _id: 'o1', estado: 'asignada' })] })
    const raw = await getAllResourceRecordsRaw()
    const stored = raw[0].body as EncryptedRecordEnvelope
    stored.ct = mutateCt(stored.ct)
    await expect(getResourceRecordsForScope(scopeKeyA)).rejects.toBeInstanceOf(OfflineRecordTamperError)
  })
})

describe('R5 — non-extractable key, raw never persisted', () => {
  it('creates a non-extractable AES-GCM key handle; raw export is rejected and no raw material is stored', async () => {
    const { key, kid, created } = await getOrCreateStorageKey(scopeKeyA)
    expect(created).toBe(true)
    expect(kid).toBe('enc-1')
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 })
    expect(key.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
    const stored = await getStoredStorageKey(scopeKeyA)
    expect(stored!.key).toBeInstanceOf(CryptoKey)
    expect(JSON.stringify(stored)).not.toContain('"k"')
    expect(JSON.stringify(stored)).not.toContain('raw')
    const again = await getOrCreateStorageKey(scopeKeyA)
    expect(again.created).toBe(false)
    expect(again.key).toBe(stored!.key)
  })
  it('rotation increments the key version, keeps retired handles for old records, and binds new records to the new kid', async () => {
    const first = await getOrCreateStorageKey(scopeKeyA)
    const envelope = await encryptPayload(scopeKeyA, RESOURCES_STORE, first.kid, first.key, payloadOf({ _id: 'old' }))
    const rotated = await rotateStorageKey(scopeKeyA)
    expect(rotated.kid).toBe('enc-2')
    expect((await getStoredStorageKey(scopeKeyA))!.keyVersion).toBe(2)
    const retired = await getStorageKeyForKid(scopeKeyA, 'enc-1')
    expect(retired).not.toBeNull()
    await expect(decryptPayload(retired!, envelope)).resolves.toBeTruthy()
    const env2 = await encryptPayload(scopeKeyA, RESOURCES_STORE, rotated.kid, rotated.key, payloadOf({ _id: 'new' }))
    expect(env2.kid).toBe('enc-2')
    await expect(decryptPayload(retired!, env2)).rejects.toBeInstanceOf(OfflineRecordTamperError)
  })
})

describe('R5 — migration v3→v4', () => {
  it('re-encrypts proven-owner records, quarantines ambiguous/legacy records, and never auto-replays them', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1', estado: 'asignada' })
    seedResource(scopeKeyA, `${scopeKeyA}:installations:i1`, 'installations', { _id: 'i1', nombre: 'Planta' })
    seedResource('other:user:x', 'other:user:x:workOrders:o2', 'workOrders', { _id: 'o2' })
    idbMock._getStore(DB_NAME, PACKAGES_STORE).put({ packageId: 'pkg-legacy', cursor: 1, version: 1, ready: true, downloadedAt: 1, lastSyncedAt: 1, freshness: 'fresh', manifest: { packageId: 'pkg-legacy' } }, 'pkg-legacy')

    const result = await migrateEncryptedStorage(scopeA)
    expect(result.status).toBe('migrated')
    expect(result).toMatchObject({ migrated: 2, quarantined: 2 })

    const raw = await getAllResourceRecordsRaw()
    expect(raw.filter(r => r.scopeKey === scopeKeyA).every(r => isEncryptedEnvelope(r.body))).toBe(true)
    const store = idbMock._getStore(DB_NAME, RESOURCES_STORE)
    expect(JSON.stringify(store._data.get(`${scopeKeyA}:workOrders:o1`))).not.toContain('asignada')

    const dec = await getResourceRecordsForScope(scopeKeyA)
    expect(dec.find(r => r.kind === 'workOrders')!.body.estado).toBe('asignada')

    const quarantined = await getQuarantinedRecords()
    expect(quarantined.length).toBe(2)
    expect(quarantined.some(q => q.reason === 'owner-unprovable' || q.reason === 'owner-mismatch')).toBe(true)
    expect(await getQuarantineCount()).toBe(2)
    expect(store._data.has('other:user:x:workOrders:o2')).toBe(false)
    expect(idbMock._getStore(DB_NAME, PACKAGES_STORE)._data.has('pkg-legacy')).toBe(false)

    expect(await getStoredSchemaVersion()).toBe(OFFLINE_STORAGE_SCHEMA_VERSION)
    expect(await isStorageEncrypted()).toBe(true)
  })
  it('is idempotent — a second run reports already-v4 and touches nothing', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1' })
    const first = await migrateEncryptedStorage(scopeA)
    expect(first.status).toBe('migrated')
    const second = await migrateEncryptedStorage(scopeA)
    expect(second.status).toBe('already-v4')
    expect(await getQuarantineCount()).toBe(0)
  })
  it('is atomic — a failing write aborts the whole migration and a retry succeeds', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1', estado: 'asignada' })
    idbMock._failNextPut(RESOURCES_STORE)
    await expect(migrateEncryptedStorage(scopeA)).rejects.toThrow()
    expect(await getStoredSchemaVersion()).toBe(1)
    const store = idbMock._getStore(DB_NAME, RESOURCES_STORE)
    expect(store._data.get(`${scopeKeyA}:workOrders:o1`).body.estado).toBe('asignada')
    expect(await getQuarantineCount()).toBe(0)
    const retry = await migrateEncryptedStorage(scopeA)
    expect(retry.status).toBe('migrated')
    expect(await getStoredSchemaVersion()).toBe(4)
    expect((await migrateEncryptedStorage(scopeA)).status).toBe('already-v4')
  })
})

describe('R5 — verified purge (destroy key + data before identity reuse)', () => {
  it('destroys the key handle and every protected record of the scope, clears active scope, and makes old ciphertext irrecoverable', async () => {
    await setActiveScope(scopeA)
    const keyInfo = await getOrCreateStorageKey(scopeKeyA)
    const envelope = await encryptPayload(scopeKeyA, RESOURCES_STORE, keyInfo.kid, keyInfo.key, payloadOf({ _id: 'o1', estado: 'secreto' }))
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1' })
    idbMock._getStore(DB_NAME, PACKAGES_STORE).put(pkgRecordFixture(scopeA), 'pkg-1')
    idbMock._getStore(DB_NAME, 'stagedUploads').put({ id: `${scopeKeyA}:bin-1`, blob: new Blob(['x']) }, `${scopeKeyA}:bin-1`)
    idbMock._getStore(DB_NAME, 'stagedUploads').put({ id: `${scopeKeyB}:bin-2`, blob: new Blob(['y']) }, `${scopeKeyB}:bin-2`)

    const result = await purgeEncryptedScope(scopeA) // awaited — never fire-and-forget
    expect(result.destroyedKeys).toBe(1)
    expect(result.purgedRecords).toBe(3) // 1 resource + 1 package + 1 stagedUpload of scope A
    expect(result.activeScopeCleared).toBe(true)

    expect(await getStoredStorageKey(scopeKeyA)).toBeNull()
    expect(await getResourceRecordsForScope(scopeKeyA)).toHaveLength(0)
    expect(await getActiveScope()).toBeNull()
    expect(idbMock._getStore(DB_NAME, 'stagedUploads')._data.has(`${scopeKeyB}:bin-2`)).toBe(true)

    // irrecoverable: a brand-new key for the same scope cannot open the destroyed key's ciphertext
    const fresh = await getOrCreateStorageKey(scopeKeyA)
    await expect(decryptPayload(fresh.key, envelope)).rejects.toBeInstanceOf(OfflineRecordTamperError)
  })
  it('migrated-then-purged leaves nothing readable and no key material', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1' })
    await migrateEncryptedStorage(scopeA)
    await purgeEncryptedScope(scopeA)
    expect(await getResourceRecordsForScope(scopeKeyA)).toHaveLength(0)
    expect(await getStoredStorageKey(scopeKeyA)).toBeNull()
  })
})

describe('R5 — unsupported platform fallback', () => {
  it('never stores plaintext when WebCrypto is unavailable; typed error, data kept read-only', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1' })
    const realCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: (a: Uint8Array) => a }, configurable: true, writable: true })
    try {
      expect(isEncryptionAvailable()).toBe(false)
      const result = await migrateEncryptedStorage(scopeA)
      expect(result.status).toBe('unsupported')
      expect(result).toMatchObject({ reason: 'webcrypto-unavailable' })
      await expect(getOrCreateStorageKey(scopeKeyA)).rejects.toBeInstanceOf(OfflineEncryptionUnavailableError)
      expect(await getStoredStorageKey(scopeKeyA)).toBeNull()
      expect(await getStoredSchemaVersion()).toBe(1)
      expect(await getQuarantineCount()).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true, writable: true })
    }
  })
  it('typed error when IndexedDB cannot persist CryptoKey handles; no plaintext fallback', async () => {
    seedResource(scopeKeyA, `${scopeKeyA}:workOrders:o1`, 'workOrders', { _id: 'o1' })
    idbMock._refuseKeyPersistence(true)
    const result = await migrateEncryptedStorage(scopeA)
    expect(result.status).toBe('unsupported')
    expect(result).toMatchObject({ reason: 'crypto-key-persistence-unavailable' })
    await expect(getOrCreateStorageKey(scopeKeyA)).rejects.toBeInstanceOf(OfflineEncryptionUnavailableError)
    expect(await getStoredStorageKey(scopeKeyA)).toBeNull()
    expect(await getStoredSchemaVersion()).toBe(1)
    expect(await getQuarantineCount()).toBe(0)
  })
})

describe('R5 — no cross-scope decryption', () => {
  it('a record encrypted for scope A cannot be opened with scope B keys or via storage reads', async () => {
    const keyA = await getOrCreateStorageKey(scopeKeyA)
    const keyB = await getOrCreateStorageKey(scopeKeyB)
    const envelope = await encryptPayload(scopeKeyA, RESOURCES_STORE, keyA.kid, keyA.key, payloadOf({ _id: 'o1', estado: 'asignada' }))
    expect(keyA.key).not.toBe(keyB.key)
    await expect(decryptPayload(keyB.key, envelope)).rejects.toBeInstanceOf(OfflineRecordTamperError)

    await persistPackageBundle({ scopeKey: scopeKeyA, pkg: pkgRecordFixture(scopeA), progress: progressFixture(1), resources: [resourceFixture(`${scopeKeyA}:workOrders:o1`, { _id: 'o1', estado: 'asignada' })] })
    expect(await getResourceRecordsForScope(scopeKeyB)).toHaveLength(0)
    expect(await getResourceRecordsForScope(scopeKeyA)).toHaveLength(1)

    // a record re-scoped to B (same ciphertext, forged scopeKey) still fails closed on read
    const store = idbMock._getStore(DB_NAME, RESOURCES_STORE)
    const recB = { ...store._data.get(`${scopeKeyA}:workOrders:o1`), id: `${scopeKeyB}:workOrders:o1`, scopeKey: scopeKeyB }
    store.put(recB, `${scopeKeyB}:workOrders:o1`)
    await expect(getResourceRecordsForScope(scopeKeyB)).rejects.toBeInstanceOf(OfflineRecordTamperError)
  })
})

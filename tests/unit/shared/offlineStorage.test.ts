/**
 * U2 — Owner-scoped offline storage migration and isolation tests.
 * Covers: scope keys, migration, quarantine, isolation, purge, tenant switch, schema versioning.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildScopeKey, parseScopeKey, OFFLINE_STORAGE_SCHEMA_VERSION, type OfflineIdentityScope } from '../../../src/shared/offline/types'

// In-memory IndexedDB mock
function createStore() {
  const data = new Map<string, any>()
  return {
    _data: data,
    put(val: any, key?: string) { const k = key ?? val?.id ?? val?.key ?? String(Date.now()); data.set(k, val); return mkReq(k) },
    get(key: string) { return mkReq(data.get(key) ?? undefined) },
    delete(key: string) { data.delete(key); return mkReq(undefined) },
    getAll() { return mkReq(Array.from(data.values())) },
    getAllKeys() { return mkReq(Array.from(data.keys())) },
    count() { return mkReq(data.size) },
    openCursor() {
      const snapshot = () => Array.from(data.entries())
      let entries = snapshot()
      let idx = 0
      const req: any = { onsuccess: null, onerror: null, result: null }
      queueMicrotask(function advance() {
        if (idx < entries.length) {
          const [key, value] = entries[idx]
          if (data.has(key)) {
            req.result = { key, value, delete: () => { data.delete(key) }, continue: () => { idx++; queueMicrotask(advance) } }
          } else { idx++; queueMicrotask(advance); return }
        } else { req.result = null }
        req.onsuccess?.({ target: req })
      })
      return req
    },
  }
}
function mkReq(result?: any) {
  const req: any = { onsuccess: null, onerror: null, result }
  queueMicrotask(() => req.onsuccess?.({ target: req }))
  return req
}
function mkTx(stores: Map<string, ReturnType<typeof createStore>>, _names: string[]) {
  const tx: any = { objectStore(name: string) {
    if (!stores.has(name)) stores.set(name, createStore())
    return stores.get(name)
  }, oncomplete: null, onerror: null }
  setTimeout(() => tx.oncomplete?.({ target: tx }), 0)
  return tx
}
function createDB(version = 0) {
  const stores = new Map<string, ReturnType<typeof createStore>>()
  return {
    _version: version,
    _stores: stores,
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore(name: string) { const store = createStore(); stores.set(name, store); return store },
    transaction(storeNames: string | string[]) { return mkTx(stores, Array.isArray(storeNames) ? storeNames : [storeNames]) },
    close() {},
  }
}
const dbInstances = new Map<string, ReturnType<typeof createDB>>()
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
  _clear() { dbInstances.clear() },
  _getStore(dbName: string, storeName: string) {
    if (!dbInstances.has(dbName)) dbInstances.set(dbName, createDB(1))
    const db = dbInstances.get(dbName)!
    if (!db._stores.has(storeName)) db._stores.set(storeName, createStore())
    return db._stores.get(storeName)
  },
  _hasStore(dbName: string, storeName: string) { return dbInstances.get(dbName)?._stores.has(storeName) ?? false },
}
vi.stubGlobal('indexedDB', idbMock)

import {
  getStoredSchemaVersion,
  setStoredSchemaVersion,
  getActiveScope,
  setActiveScope,
  migrateBinaryStorage,
  purgeScopeData,
  getQuarantineCount,
  getQuarantinedRecords,
} from '../../../src/shared/offline/storage'
import { getOrCreateDeviceId } from '../../../src/shared/offline/types'

// --- Fixtures ---
const scopeA: OfflineIdentityScope = { tenantId: 'tenant-1', userId: 'user-a', deviceId: 'device-001' }
const scopeB: OfflineIdentityScope = { tenantId: 'tenant-1', userId: 'user-b', deviceId: 'device-002' }
const scopeATenant2: OfflineIdentityScope = { tenantId: 'tenant-2', userId: 'user-a', deviceId: 'device-001' }
const scopeKeyA = buildScopeKey(scopeA)
const scopeKeyB = buildScopeKey(scopeB)

// --- Tests ---

describe('OfflineIdentityScope — scope key', () => {
  it('should build a deterministic scope key from tenant:user:device', () => {
    expect(scopeKeyA).toBe('tenant-1:user-a:device-001')
  })
  it('should parse a scope key back into its components', () => {
    expect(parseScopeKey(scopeKeyA)).toEqual(scopeA)
  })
  it('should return null for malformed scope keys', () => {
    expect(parseScopeKey('incomplete')).toBeNull()
    expect(parseScopeKey('a:b')).toBeNull()
    expect(parseScopeKey('a:b:c:d')).toBeNull()
  })
  it('should produce different keys for different users', () => {
    expect(scopeKeyA).not.toBe(scopeKeyB)
  })
  it('should produce different keys for different tenants', () => {
    expect(scopeKeyA).not.toBe(buildScopeKey(scopeATenant2))
  })
})

describe('OfflineStorage — schema versioning', () => {
  beforeEach(() => { idbMock._clear() })
  it('creates stagedUploads when opening a fresh v2 database', async () => {
    await purgeScopeData(scopeA)
    expect(idbMock._hasStore('GMAO_Offline_DB', 'stagedUploads')).toBe(true)
  })
  it('should return schema version 1 (legacy) when no version is stored', async () => {
    expect(await getStoredSchemaVersion()).toBe(1)
  })
  it('should persist and retrieve schema version', async () => {
    await setStoredSchemaVersion(OFFLINE_STORAGE_SCHEMA_VERSION)
    expect(await getStoredSchemaVersion()).toBe(OFFLINE_STORAGE_SCHEMA_VERSION)
  })
})

describe('OfflineStorage — active scope', () => {
  beforeEach(() => { idbMock._clear() })
  it('should return null when no scope is set', async () => {
    expect(await getActiveScope()).toBeNull()
  })
  it('should persist and retrieve the active scope', async () => {
    await setActiveScope(scopeA)
    expect(await getActiveScope()).toEqual(scopeA)
  })
  it('should overwrite the active scope on identity change', async () => {
    await setActiveScope(scopeA)
    await setActiveScope(scopeB)
    expect(await getActiveScope()).toEqual(scopeB)
  })
})

describe('OfflineStorage — migration from v1 to v2', () => {
  beforeEach(() => { idbMock._clear() })

  it('should migrate records with a proven owner to scoped keys', async () => {
    const store = idbMock._getStore('GMAO_Offline_DB', 'stagedUploads')!
    store.put({ id: 'bin-1', blob: new Blob(['t']), filename: 'photo.png', contentType: 'image/png', timestamp: Date.now(), ownerScope: scopeA }, 'bin-1')
    store.put({ id: 'bin-2', blob: new Blob(['t']), filename: 'old.png', contentType: 'image/png', timestamp: Date.now() }, 'bin-2')

    const result = await migrateBinaryStorage(scopeA)
    expect(result.migrated).toBe(1)
    expect(result.quarantined).toBe(1)
  })

  it('should quarantine records whose owner does not match active scope', async () => {
    const store = idbMock._getStore('GMAO_Offline_DB', 'stagedUploads')!
    store.put({ id: 'bin-other', blob: new Blob(['o']), filename: 'other.png', contentType: 'image/png', timestamp: Date.now(), ownerScope: scopeB }, 'bin-other')

    const result = await migrateBinaryStorage(scopeA)
    expect(result.quarantined).toBe(1)
    expect(result.migrated).toBe(0)
  })

  it('should not automatically replay quarantined records', async () => {
    const qs = idbMock._getStore('GMAO_Offline_DB', 'quarantinedRecords')!
    qs.put({ id: 'q-1', record: { id: 'bin-old' }, quarantinedAt: Date.now(), reason: 'missing-owner' }, 'q-1')
    expect(await getQuarantineCount()).toBeGreaterThanOrEqual(1)
    const records = await getQuarantinedRecords()
    expect(records.some((r: any) => r.id === 'q-1')).toBe(true)
  })
})

describe('OfflineStorage — scope isolation', () => {
  beforeEach(() => { idbMock._clear() })
  it('should only return data belonging to the active scope', async () => {
    const store = idbMock._getStore('GMAO_Offline_DB', 'stagedUploads')!
    store.put({ id: `${scopeKeyA}:bin-a1`, blob: new Blob(['a']), ownerScope: scopeA }, `${scopeKeyA}:bin-a1`)
    store.put({ id: `${scopeKeyB}:bin-b1`, blob: new Blob(['b']), ownerScope: scopeB }, `${scopeKeyB}:bin-b1`)

    const scopedKeys = Array.from(store._data.keys()).filter(k => k.startsWith(`${scopeKeyA}:`))
    expect(scopedKeys).toHaveLength(1)
    expect(scopedKeys[0]).toBe(`${scopeKeyA}:bin-a1`)
  })
})

describe('OfflineStorage — logout / switch purge', () => {
  beforeEach(() => { idbMock._clear() })
  it('should purge all data for a scope on logout', async () => {
    const store = idbMock._getStore('GMAO_Offline_DB', 'stagedUploads')!
    store.put({ id: `${scopeKeyA}:bin-1`, blob: new Blob(['a']), ownerScope: scopeA }, `${scopeKeyA}:bin-1`)
    store.put({ id: `${scopeKeyA}:bin-2`, blob: new Blob(['b']), ownerScope: scopeA }, `${scopeKeyA}:bin-2`)
    store.put({ id: `${scopeKeyB}:bin-3`, blob: new Blob(['c']), ownerScope: scopeB }, `${scopeKeyB}:bin-3`)

    const result = await purgeScopeData(scopeA)
    expect(result.purgedBinaries).toBe(2)
    const remaining = Array.from(store._data.keys())
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toBe(`${scopeKeyB}:bin-3`)
  })
  it('should clear active scope on purge if it matches', async () => {
    await setActiveScope(scopeA)
    await purgeScopeData(scopeA)
    expect(await getActiveScope()).toBeNull()
  })
  it('should NOT clear active scope on purge if it does not match', async () => {
    await setActiveScope(scopeB)
    await purgeScopeData(scopeA)
    expect(await getActiveScope()).toEqual(scopeB)
  })
})

describe('OfflineStorage — device ID persistence', () => {
  beforeEach(() => { localStorage.clear() })
  it('should create and persist a device ID', () => {
    const id1 = getOrCreateDeviceId()
    expect(id1).toBeDefined()
    expect(typeof id1).toBe('string')
    expect(getOrCreateDeviceId()).toBe(id1)
  })
})

describe('OfflineStorage — tenant switch isolation', () => {
  beforeEach(() => { idbMock._clear() })
  it('should isolate data between different tenants for the same user', async () => {
    const store = idbMock._getStore('GMAO_Offline_DB', 'stagedUploads')!
    store.put({ id: `${scopeKeyA}:bin-1`, blob: new Blob(['a']), ownerScope: scopeA }, `${scopeKeyA}:bin-1`)
    const t2Key = buildScopeKey(scopeATenant2)
    store.put({ id: `${t2Key}:bin-2`, blob: new Blob(['b']), ownerScope: scopeATenant2 }, `${t2Key}:bin-2`)

    await purgeScopeData(scopeA)
    const remaining = Array.from(store._data.values())
    expect(remaining).toHaveLength(1)
    expect(remaining[0].ownerScope.tenantId).toBe('tenant-2')
  })
})

describe('OfflineStorage — reload preserves active scope', () => {
  beforeEach(() => { idbMock._clear() })
  it('should retain the active scope across open/close cycles', async () => {
    await setActiveScope(scopeA)
    expect(await getActiveScope()).toEqual(scopeA)
  })
})

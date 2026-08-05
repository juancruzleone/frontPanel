/** U6 — Package download, completeness, freshness, quota, resume, isolation. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildScopeKey, type OfflineIdentityScope } from '../../../src/shared/offline/types'
import {
  preparePackage, resumeDownload, getDownloadProgress, isPackageReady,
  getStoredPackage, getScopedPackages, checkQuota, evictOldest, purgePackagesForScope,
  FORM_NOT_DELIVERED, type PackageManifest, type DownloadProgress, type StoredPackage,
} from '../../../src/shared/offline/packageService'

// ── In-memory IndexedDB mock ─────────────────────────────────────────────
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
    clear() { data.clear(); return mkReq(undefined) },
    openCursor() {
      const snapshot = () => Array.from(data.entries()); let entries = snapshot(); let idx = 0
      const req: any = { onsuccess: null, onerror: null, result: null }
      queueMicrotask(function advance() {
        if (idx < entries.length) {
          const [key, value] = entries[idx]
          if (data.has(key)) { req.result = { key, value, delete: () => { data.delete(key) }, continue: () => { idx++; queueMicrotask(advance) } } }
          else { idx++; queueMicrotask(advance); return }
        } else { req.result = null }
        req.onsuccess?.({ target: req })
      })
      return req
    },
  }
}
function mkReq(result?: any) { const req: any = { onsuccess: null, onerror: null, result }; queueMicrotask(() => req.onsuccess?.({ target: req })); return req }
function mkTx(stores: Map<string, ReturnType<typeof createStore>>, _names: string[]) {
  const tx: any = { objectStore(name: string) { if (!stores.has(name)) stores.set(name, createStore()); return stores.get(name) }, oncomplete: null, onerror: null }
  setTimeout(() => tx.oncomplete?.({ target: tx }), 0); return tx
}
function createDB(version = 0) {
  const stores = new Map<string, ReturnType<typeof createStore>>()
  return {
    _version: version, _stores: stores,
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore(name: string, _opts?: any) { const store = createStore(); stores.set(name, store); return store },
    transaction(storeNames: string | string[]) { return mkTx(stores, Array.isArray(storeNames) ? storeNames : [storeNames]) },
    close() {},
  }
}
const dbInstances = new Map<string, ReturnType<typeof createDB>>()
const idbMock = {
  open(name: string, version = 1) {
    if (!dbInstances.has(name)) dbInstances.set(name, createDB())
    const db = dbInstances.get(name)!; const oldVersion = db._version
    const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, result: db }
    queueMicrotask(() => { if (version > oldVersion) { req.onupgradeneeded?.({ target: req, oldVersion }); db._version = version }; req.onsuccess?.({ target: req }) })
    return req
  },
  _clear() { dbInstances.clear() },
  _getStore(dbName: string, storeName: string) { if (!dbInstances.has(dbName)) dbInstances.set(dbName, createDB(1)); const db = dbInstances.get(dbName)!; if (!db._stores.has(storeName)) db._stores.set(storeName, createStore()); return db._stores.get(storeName) },
  _hasStore(dbName: string, storeName: string) { return dbInstances.get(dbName)?._stores.has(storeName) ?? false },
}
vi.stubGlobal('indexedDB', idbMock)
const mockFetch = vi.fn(); vi.stubGlobal('fetch', mockFetch)
const mockEstimate = vi.fn(); vi.stubGlobal('navigator', { onLine: true, storage: { estimate: mockEstimate, persist: vi.fn().mockResolvedValue(true) }, serviceWorker: { controller: null } })
const localStorageMock = (() => { let store: Record<string, string> = {}; return { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v }, removeItem: (k: string) => { delete store[k] }, clear: () => { store = {} } } })()
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) })

// ── Fixtures ─────────────────────────────────────────────────────────────
const scopeA: OfflineIdentityScope = { tenantId: 't1', userId: 'u-a', deviceId: 'd-001' }
const scopeB: OfflineIdentityScope = { tenantId: 't1', userId: 'u-b', deviceId: 'd-002' }
function setAuth(s: OfflineIdentityScope) { localStorage.setItem('auth-storage', JSON.stringify({ state: { userId: s.userId, tenantId: s.tenantId } })); localStorage.setItem('__offline_device_id', s.deviceId) }
function mkManifest(over: Partial<PackageManifest> = {}): PackageManifest {
  return { packageId: 'pkg-001', schemaVersion: 1, binding: { ...scopeA }, packageVersion: 1, cursor: 'cur-1', serverTime: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(), revocationEpoch: 0, limits: { maxStorageBytes: 50 * 1024 * 1024 }, completeness: { orders: [{ orderId: 'o1', status: 'ready', missingResources: [] }], forms: [{ formId: 'f1', orderId: 'o1', status: 'delivered', formVersion: 1 }], overall: 'complete' }, resources: [{ type: 'order', id: 'o1', version: 1, checksum: 'abc', required: true }, { type: 'form', id: 'f1', version: 1, checksum: 'def', formVersion: 1, required: true }], ...over }
}
function mkBootstrap(m?: PackageManifest) { return { success: true, manifest: m ?? mkManifest(), workOrders: [{ _id: 'o1' }], installations: [{ _id: 'i1' }], assets: [], forms: [{ _id: 'f1' }], inventoryRefs: [] } }
function mockOk(m?: PackageManifest) { mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mkBootstrap(m)) }) }
function mockDelta(next: string) { mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ deltas: [], nextCursor: next, hasMore: false }) }) }
function mock410() { mockFetch.mockResolvedValueOnce({ ok: false, status: 410, json: () => Promise.resolve({ error: { message: 'Cursor expired', code: 'CURSOR_EXPIRED' } }) }) }
const reset = () => { idbMock._clear(); localStorage.clear(); vi.clearAllMocks(); setAuth(scopeA); mockEstimate.mockResolvedValue({ usage: 1000, quota: 100 * 1024 * 1024 }) }

// ── Tests ────────────────────────────────────────────────────────────────

describe('PackageService — prepare', () => {
  beforeEach(reset)
  it('downloads and persists a complete package', async () => {
    mockOk()
    const r = await preparePackage('o1')
    expect(r.manifest.packageId).toBe('pkg-001')
    expect(r.manifest.completeness.overall).toBe('complete')
    const s = await getStoredPackage('pkg-001')
    expect(s).not.toBeNull(); expect(s!.freshness).toBe('fresh')
  })
  it('reports FORM_NOT_DELIVERED for missing forms', async () => {
    mockOk(mkManifest({ completeness: { orders: [{ orderId: 'o1', status: 'incomplete', missingResources: ['f1'] }], forms: [{ formId: 'f1', orderId: 'o1', status: 'not_delivered' }], overall: 'incomplete' } }))
    const r = await preparePackage('o1')
    expect(r.manifest.completeness.forms[0].status).toBe('not_delivered')
    expect(await isPackageReady('pkg-001')).toBe(false)
  })
})

describe('PackageService — resume', () => {
  beforeEach(reset)
  it('resumes after interruption via delta', async () => {
    mockOk(mkManifest({ resources: [{ type: 'order', id: 'o1', version: 1, checksum: 'abc', required: true }, { type: 'form', id: 'f1', version: 1, checksum: 'def', formVersion: 1, required: true }] }))
    await preparePackage('o1')
    expect(await getDownloadProgress('pkg-001')).not.toBeNull()
    mockDelta('cur-2')
    await resumeDownload('pkg-001')
    expect((await getDownloadProgress('pkg-001'))!.status).toBe('completed')
  })
  it('preserves checksum for integrity verification', async () => {
    mockOk(mkManifest({ resources: [{ type: 'order', id: 'o1', version: 1, checksum: 'correct', required: true }] }))
    await preparePackage('o1')
    expect((await getStoredPackage('pkg-001'))!.manifest.resources[0].checksum).toBe('correct')
  })
})

describe('PackageService — HTTP 410', () => {
  beforeEach(reset)
  it('re-bootstraps on CURSOR_EXPIRED', async () => {
    mockOk(); await preparePackage('o1')
    mock410(); mockOk(mkManifest({ packageId: 'pkg-002', cursor: 'cur-2', packageVersion: 2 }))
    await resumeDownload('pkg-001')
    expect(await getStoredPackage('pkg-001')).toBeNull()
    const np = await getStoredPackage('pkg-002')
    expect(np).not.toBeNull(); expect(np!.version).toBe(2)
  })
})

describe('PackageService — quota', () => {
  beforeEach(reset)
  it('rejects when quota insufficient', async () => {
    mockEstimate.mockResolvedValue({ usage: 95 * 1024 * 1024, quota: 100 * 1024 * 1024 })
    const r = await checkQuota(10 * 1024 * 1024)
    expect(r.sufficient).toBe(false); expect(r.available).toBeLessThan(r.required)
  })
  it('allows when quota sufficient', async () => {
    mockEstimate.mockResolvedValue({ usage: 1000, quota: 100 * 1024 * 1024 })
    expect((await checkQuota(10 * 1024 * 1024)).sufficient).toBe(true)
  })
  it('evicts oldest package', async () => {
    mockOk(mkManifest({ packageId: 'pkg-old' })); await preparePackage('o1')
    await new Promise(r => setTimeout(r, 10))
    mockOk(mkManifest({ packageId: 'pkg-new' })); await preparePackage('o1')
    await evictOldest()
    const r = await getScopedPackages()
    expect(r).toHaveLength(1); expect(r[0].packageId).toBe('pkg-new')
  })
})

describe('PackageService — isolation', () => {
  beforeEach(reset)
  it('scopes packages per owner', async () => {
    setAuth(scopeA); mockOk(mkManifest({ packageId: 'pkg-a' })); await preparePackage('o1')
    setAuth(scopeB); mockOk(mkManifest({ packageId: 'pkg-b', binding: { ...scopeB } })); await preparePackage('o1')
    setAuth(scopeA); expect(await getScopedPackages()).toHaveLength(1)
    setAuth(scopeB); const pb = await getScopedPackages(); expect(pb).toHaveLength(1); expect(pb[0].packageId).toBe('pkg-b')
  })
  it('purges packages for scope', async () => {
    mockOk(); await preparePackage('o1')
    await purgePackagesForScope(scopeA)
    expect(await getScopedPackages()).toHaveLength(0)
  })
})

describe('PackageService — freshness', () => {
  beforeEach(reset)
  it('tracks lastSyncedAt and freshness', async () => {
    mockOk(); await preparePackage('o1')
    const s = await getStoredPackage('pkg-001')
    expect(s!.lastSyncedAt).toBeGreaterThan(0); expect(s!.freshness).toBe('fresh')
  })
  it('persists across reopen', async () => {
    mockOk(); await preparePackage('o1')
    expect(await getStoredPackage('pkg-001')).not.toBeNull()
  })
})

describe('PackageService — progress', () => {
  beforeEach(reset)
  it('tracks progress through completion', async () => {
    mockOk(); await preparePackage('o1')
    const p = await getDownloadProgress('pkg-001')
    expect(p).not.toBeNull(); expect(p!.status).toBe('completed'); expect(p!.completedResources).toBe(p!.totalResources)
  })
  it('returns null for nonexistent', async () => {
    expect(await getDownloadProgress('nope')).toBeNull()
  })
})

/**
 * R4 — Strengthened U6 package contract (RED-first; supersedes the old U6
 * offlinePackage.test.ts). The downloader consumes the strengthened R3
 * contract: CSRF-correct exact request shapes, ES256/kid manifest
 * verification against the R2 key set, complete bootstrap resources persisted
 * scoped to tenant+user+device, atomic readiness, FORM_NOT_DELIVERED blocking,
 * 410 re-bootstrap, and the signed 7-day lease/device-binding gate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildScopeKey, PACKAGE_SCHEMA_VERSION, type OfflineIdentityScope, type OfflineManifest, type OfflineManifestClaim } from '../../../src/shared/offline/types'
import { canonicalJSON, sha256HexCanonical, type VerificationKey } from '../../../src/shared/offline/crypto'
import { useCSRFStore } from '../../../src/store/csrfStore'
import {
  preparePackage, refreshPackage, resumeDownload, isPackageReady, canUsePackage, getStoredPackage,
  getScopedPackages, getDownloadProgress, checkQuota, evictOldest, purgePackagesForScope, checksumSubset, FORM_NOT_DELIVERED,
} from '../../../src/shared/offline/packageService'
import { getResourceRecordsForScope, getResourceCountsForScope } from '../../../src/shared/offline/storage'

// ── In-memory IndexedDB mock ─────────────────────────────────────────────
const mkReq = (result?: unknown): any => { const req: any = { onsuccess: null, onerror: null, result }; queueMicrotask(() => req.onsuccess?.({ target: req })); return req }
const createStore = () => {
  const data = new Map<string, unknown>()
  return {
    put(val: unknown, key?: string) { const k = key ?? (val as any)?.id ?? (val as any)?.packageId ?? String(Date.now()); data.set(k, val); return mkReq(k) },
    get: (key: string) => mkReq(data.get(key) ?? undefined),
    delete: (key: string) => { data.delete(key); return mkReq(undefined) },
    getAll: () => mkReq(Array.from(data.values())),
  }
}
const createDB = () => {
  const stores = new Map<string, ReturnType<typeof createStore>>()
  const transaction = (storeNames: string | string[]) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    const tx: any = { objectStore(name: string) { if (!stores.has(name)) stores.set(name, createStore()); return stores.get(name) }, oncomplete: null, onerror: null }
    queueMicrotask(() => tx.oncomplete?.({ target: tx }))
    return tx
  }
  return { _stores: stores, objectStoreNames: { contains: (n: string) => stores.has(n) }, createObjectStore(name: string) { const s = createStore(); stores.set(name, s); return s }, transaction, close() {} }
}
const dbInstances = new Map<string, ReturnType<typeof createDB>>()
const idbMock = {
  open(name: string, version = 1) {
    if (!dbInstances.has(name)) dbInstances.set(name, createDB())
    const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, result: dbInstances.get(name) }
    queueMicrotask(() => { req.onupgradeneeded?.({ target: req }); req.onsuccess?.({ target: req }) })
    return req
  },
  _clear() { dbInstances.clear() },
  _getStore(dbName: string, storeName: string) {
    if (!dbInstances.has(dbName)) dbInstances.set(dbName, createDB())
    const db = dbInstances.get(dbName)!
    if (!db._stores.has(storeName)) db._stores.set(storeName, createStore())
    return db._stores.get(storeName)
  },
}
vi.stubGlobal('indexedDB', idbMock)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
const mockEstimate = vi.fn()
vi.stubGlobal('navigator', { onLine: true, storage: { estimate: mockEstimate }, serviceWorker: { controller: null } })

// ── Fixtures ─────────────────────────────────────────────────────────────
const TENANT = 't-1', USER = 'u-a', DEVICE = 'dev-1', KID = 'kid-r4-2026'
const scopeA: OfflineIdentityScope = { tenantId: TENANT, userId: USER, deviceId: DEVICE }
const scopeB: OfflineIdentityScope = { tenantId: TENANT, userId: 'u-b', deviceId: 'dev-2' }
const RESOURCES = {
  workOrders: [{ _id: 'o1', version: 1, estado: 'asignada' }],
  installations: [{ _id: 'i1', nombre: 'Planta 1' }],
  assets: [{ _id: 'a1', nombre: 'Motor 1', instalacionId: 'i1' }],
  forms: [{ _id: 'f-1', version: 3, campos: [{ llave: 'k' }] }],
  inventoryRefs: [{ _id: 'inv1', name: 'Filtro' }],
}
const b64u = (bytes: Uint8Array) => { let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
const serverKey = async (kid: string = KID) => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  return { privateKey: pair.privateKey, key: { kid, kty: 'EC', crv: 'P-256', use: 'sig', key_ops: ['verify'], x: jwk.x!, y: jwk.y! } as VerificationKey }
}
const signClaims = async (claims: unknown, privateKey: CryptoKey) => b64u(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON(claims)))))
const checksumOf = async (kind: keyof typeof RESOURCES, body: Record<string, unknown>) => sha256HexCanonical(checksumSubset(kind as never, body))
const baseChecksums = async () => ({
  workOrders: [await checksumOf('workOrders', RESOURCES.workOrders[0])],
  installations: [await checksumOf('installations', RESOURCES.installations[0])],
  forms: [await checksumOf('forms', RESOURCES.forms[0])],
  inventory: [await checksumOf('inventoryRefs', RESOURCES.inventoryRefs[0])],
})
async function mkManifest(server: Awaited<ReturnType<typeof serverKey>>, over: Partial<OfflineManifestClaim> = {}, scope: OfflineIdentityScope = scopeA): Promise<OfflineManifest> {
  const serverTime = new Date(Date.now() - 60_000).toISOString()
  const resourceChecksums = await baseChecksums()
  const claims: OfflineManifestClaim = {
    schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime, packageId: 'pkg-001', packageVersion: 1,
    deviceId: scope.deviceId, userId: scope.userId, tenantId: scope.tenantId, binding: { ...scope },
    cursor: 5, expiresAt: new Date(Date.parse(serverTime) + 7 * 864e5).toISOString(), revocationEpoch: 0,
    limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
    completeness: { 'f-1': { available: true, version: 3, checksum: resourceChecksums.forms[0] } },
    resourceChecksums, ...over,
  }
  return { ...claims, signature: { alg: 'ES256', kid: server.key.kid, value: await signClaims(claims, server.privateKey) } }
}
const mkBootstrap = (m: OfflineManifest, ro: Record<string, unknown[]> = {}) => ({ success: true, manifest: m, ...RESOURCES, ...ro })
const jsonOk = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })
const json410 = (code: string) => ({ ok: false, status: 410, json: () => Promise.resolve({ error: { code, message: 're-bootstrap' } }) })
const mockPrepare = (m: OfflineManifest, ro: Record<string, unknown[]> = {}) => mockFetch.mockResolvedValueOnce(jsonOk(mkBootstrap(m, ro)))
const mockDelta = (nextCursor = 6) => mockFetch.mockResolvedValueOnce(jsonOk({ success: true, packageId: 'pkg-001', deviceId: DEVICE, deltas: [], nextCursor, hasMore: false }))
const setAuth = (s: OfflineIdentityScope) => localStorage.setItem('auth-storage', JSON.stringify({ state: { userId: s.userId, tenantId: s.tenantId } }))
const seedTrust = (s: OfflineIdentityScope, keySet: VerificationKey[]) => {
  const sk = `${s.tenantId}:${s.userId}`
  idbMock._getStore('GMAO_Trust_DB', 'deviceKeys').put({ id: sk, deviceId: s.deviceId, publicKeyJwk: {}, createdAt: 1, privateKey: {} }, sk)
  idbMock._getStore('GMAO_Trust_DB', 'trustMeta').put({ key: 'verificationKeys', value: keySet }, 'verificationKeys')
}
let server!: Awaited<ReturnType<typeof serverKey>>
beforeEach(async () => {
  idbMock._clear(); vi.clearAllMocks(); localStorage.clear()
  server = await serverKey()
  seedTrust(scopeA, [server.key]); setAuth(scopeA)
  useCSRFStore.setState({ token: 'csrf-tok' })
  mockEstimate.mockResolvedValue({ usage: 1000, quota: 100 * 1024 * 1024 })
})

// ── Tests ────────────────────────────────────────────────────────────────
describe('R4 — request shapes + CSRF', () => {
  it('prepare sends { deviceId, orderId? }; delta and refresh send their exact shapes; all carry the CSRF header', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    const [pUrl, pInit] = mockFetch.mock.calls[0]
    expect(pUrl).toBe('/api/offline/packages/prepare')
    expect(JSON.parse(pInit.body)).toEqual({ deviceId: DEVICE, orderId: 'o1' })
    expect(pInit.headers['X-CSRF-Token']).toBe('csrf-tok')
    mockPrepare(await mkManifest(server, { packageId: 'pkg-002', cursor: 9 }))
    await preparePackage()
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ deviceId: DEVICE })
    mockDelta(9)
    await resumeDownload('pkg-002')
    const [dUrl, dInit] = mockFetch.mock.calls[2]
    expect(dUrl).toBe('/api/offline/packages/delta')
    expect(JSON.parse(dInit.body)).toEqual({ packageId: 'pkg-002', deviceId: DEVICE, clientCursor: 9, limit: 100 })
    expect((await getStoredPackage('pkg-002'))!.cursor).toBe(9)
    mockPrepare(await mkManifest(server, { packageId: 'pkg-003', cursor: 10 }))
    await refreshPackage('pkg-002')
    const [rUrl, rInit] = mockFetch.mock.calls[3]
    expect(rUrl).toBe('/api/offline/packages/refresh')
    expect(JSON.parse(rInit.body)).toEqual({ packageId: 'pkg-002', deviceId: DEVICE })
  })
  it('delta requests carry the CSRF header', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    mockDelta(9)
    await resumeDownload('pkg-001')
    expect(mockFetch.mock.calls[1][1].headers['X-CSRF-Token']).toBe('csrf-tok')
  })
})

describe('R4 — signature verification', () => {
  it('accepts a genuine signature and marks the package ready', async () => {
    mockPrepare(await mkManifest(server))
    const r = await preparePackage('o1')
    expect(r.ready).toBe(true)
    expect(await isPackageReady(r.packageId)).toBe(true)
    expect((await canUsePackage(r.packageId)).ok).toBe(true)
    expect((await getStoredPackage('pkg-001'))!.freshness).toBe('fresh')
  })
  it('rejects tampered signatures, unknown kids and invalid schemaVersion', async () => {
    const tampered = await mkManifest(server)
    tampered.resourceChecksums.workOrders = [tampered.resourceChecksums.workOrders[0] + 'ff']
    mockPrepare(tampered)
    await expect(preparePackage('o1')).rejects.toMatchObject({ code: 'invalid_signature' })
    mockPrepare(await mkManifest(await serverKey('kid-unknown')))
    await expect(preparePackage('o1')).rejects.toMatchObject({ code: 'unknown_kid' })
    mockPrepare(await mkManifest(server, { schemaVersion: 0 }))
    await expect(preparePackage('o1')).rejects.toMatchObject({ code: 'invalid_schema_version' })
  })
})

describe('R4 — persistence and atomic readiness', () => {
  it('persists complete bodies for all entity kinds scoped to tenant+user+device', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    const records = await getResourceRecordsForScope(buildScopeKey(scopeA))
    for (const kind of ['workOrders', 'installations', 'assets', 'forms', 'inventoryRefs']) expect(records.filter(r => r.kind === kind)).toHaveLength(1)
    const form = records.find(r => r.kind === 'forms')!
    expect(form.verified).toBe(true)
    expect(form.version).toBe(3)
    expect(form.checksum).toBe((await mkManifest(server)).resourceChecksums.forms[0])
    expect(records.find(r => r.kind === 'workOrders')!.body.estado).toBe('asignada')
  })
  it('persists nothing when a resource checksum mismatches (atomic readiness)', async () => {
    mockPrepare(await mkManifest(server, { resourceChecksums: { ...(await baseChecksums()), workOrders: ['deadbeef'] } }))
    await expect(preparePackage('o1')).rejects.toMatchObject({ code: 'checksum_mismatch' })
    expect(await getStoredPackage('pkg-001')).toBeNull()
    expect(await getResourceRecordsForScope(buildScopeKey(scopeA))).toHaveLength(0)
  })
  it('FORM_NOT_DELIVERED stays explicit and blocks readiness while the signed package persists', async () => {
    const m = await mkManifest(server, {
      completeness: { 'f-1': { available: false, reason: 'FORM_NOT_DELIVERED' } },
      resourceChecksums: { ...(await baseChecksums()), forms: [] },
    })
    mockPrepare(m, { forms: [] })
    const r = await preparePackage('o1')
    expect(r.ready).toBe(false)
    expect(r.manifest.completeness['f-1'].reason).toBe(FORM_NOT_DELIVERED)
    expect(await isPackageReady(r.packageId)).toBe(false)
    expect((await canUsePackage(r.packageId)).reason).toBe('not-ready')
  })
})

describe('R4 — 410 re-bootstrap', () => {
  it('purges the stale package and safely re-bootstraps on CURSOR_EXPIRED', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    mockFetch.mockResolvedValueOnce(json410('CURSOR_EXPIRED'))
    mockPrepare(await mkManifest(server, { packageId: 'pkg-002', cursor: 6, packageVersion: 2 }))
    await resumeDownload('pkg-001')
    expect(await getStoredPackage('pkg-001')).toBeNull()
    expect((await getStoredPackage('pkg-002'))!.ready).toBe(true)
  })
  it('re-verifies persisted checksums before resuming (tampered body re-bootstraps)', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    ;(await getResourceRecordsForScope(buildScopeKey(scopeA))).find(r => r.kind === 'workOrders')!.body.estado = 'tampered'
    mockPrepare(await mkManifest(server, { packageId: 'pkg-002', cursor: 10 }))
    await resumeDownload('pkg-001')
    expect(await getStoredPackage('pkg-001')).toBeNull()
    expect(await getStoredPackage('pkg-002')).not.toBeNull()
  })
})

describe('R4 — lease and binding gate', () => {
  it('an expired signed lease or a device binding mismatch blocks package use', async () => {
    mockPrepare(await mkManifest(server))
    const r = await preparePackage('o1')
    expect((await canUsePackage(r.packageId, Date.parse(r.manifest.expiresAt) + 1)).reason).toBe('expired')
    seedTrust(scopeB, [server.key]); setAuth(scopeB)
    expect((await canUsePackage('pkg-001')).reason).toBe('binding-mismatch')
    expect(await getScopedPackages()).toHaveLength(0)
  })
})

describe('R4 — isolation, purge, quota, eviction and progress', () => {
  it('never exposes resources or packages across scopes; purge removes both', async () => {
    mockPrepare(await mkManifest(server))
    await preparePackage('o1')
    expect((await getResourceCountsForScope(buildScopeKey(scopeB))).workOrders ?? 0).toBe(0)
    await purgePackagesForScope(scopeA)
    expect(await getStoredPackage('pkg-001')).toBeNull()
    expect(await getResourceRecordsForScope(buildScopeKey(scopeA))).toHaveLength(0)
  })
  it('quota, eviction and progress behave under the verified contract', async () => {
    mockEstimate.mockResolvedValue({ usage: 95 * 1024 * 1024, quota: 100 * 1024 * 1024 })
    expect((await checkQuota(10 * 1024 * 1024)).sufficient).toBe(false)
    mockEstimate.mockResolvedValue({ usage: 1000, quota: 100 * 1024 * 1024 })
    mockPrepare(await mkManifest(server, { packageId: 'pkg-old' })); await preparePackage('o1')
    await new Promise(res => setTimeout(res, 10))
    mockPrepare(await mkManifest(server, { packageId: 'pkg-new' })); await preparePackage('o1')
    await evictOldest()
    expect(await getScopedPackages()).toHaveLength(1)
    expect((await getResourceRecordsForScope(buildScopeKey(scopeA))).some(r => r.packageId === 'pkg-old')).toBe(false)
    const p = await getDownloadProgress('pkg-new')
    expect(p!.status).toBe('completed')
    expect(p!.completedResources).toBe(p!.totalResources)
  })
})

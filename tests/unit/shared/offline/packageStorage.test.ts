/**
 * R5 — Encrypted package storage + readiness: seal/open/purge/readiness.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── IDB mock ────────────────────────────────────────────────────────────
interface MockRec { [k: string]: unknown }
const stores: Record<string, Record<string, MockRec>> = {}

function mkReq(result?: unknown) {
  let ok: ((e: { target: { result: unknown } }) => void) | null = null
  const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result, error: null }
  queueMicrotask(() => ok?.({ target: { result } }))
  return r
}

function mockStore(name: string) {
  const s = stores[name] ?? (stores[name] = {})
  return {
    put: vi.fn().mockImplementation((val: MockRec, key?: string) => { const k = key ?? (val as { id?: string }).id ?? 'x'; s[k] = val; return mkReq(undefined) }),
    get: vi.fn().mockImplementation((k: string) => mkReq(s[k])),
    delete: vi.fn().mockImplementation((k: string) => { delete s[k]; return mkReq(undefined) }),
    getAll: vi.fn().mockImplementation(() => mkReq(Object.values(s))),
  }
}

function mockTransaction(storeNames: string[]) {
  const tx = {
    objectStore: (n: string) => mockStore(n),
    oncomplete: null as unknown as (() => void) | null,
    onerror: null as unknown as (() => void) | null,
  }
  // Fire oncomplete after a macrotask — gives txDone time to set the handler
  setTimeout(() => tx.oncomplete?.(), 0)
  return tx
}

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    let ok: ((e: { target: { result: unknown } }) => void) | null = null
    const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result: undefined as unknown, error: null }
    queueMicrotask(() => {
      r.result = {
        objectStoreNames: { contains: () => true },
        transaction: (names: string | string[]) => mockTransaction(Array.isArray(names) ? names : [names]),
      }
      ok?.({ target: { result: r.result } })
    })
    return r
  }),
})

const { generateStorageKey } = await import('../../../../src/shared/offline/crypto')
const { sealAndPersistBootstrap, openPersistedBootstrap, clearPackageStorage, getPackageMeta, listReadyPackages, buildPackageScopeKey } = await import('../../../../src/shared/offline/packageStorage')
const { checkPackageReadiness } = await import('../../../../src/shared/offline/packageReadiness')
const { PACKAGE_SCHEMA_VERSION } = await import('../../../../src/shared/offline/packageTypes')
import type { OfflineManifest, OfflineBootstrap } from '../../../../src/shared/offline/packageTypes'

function makeManifest(overrides: Partial<OfflineManifest> = {}): OfflineManifest {
  return {
    schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
    packageId: 'pkg-1', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
    binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
    cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(), revocationEpoch: 0,
    limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
    completeness: { tpl1: { available: true, version: 1, checksum: 'c1' } },
    resourceChecksums: { workOrders: ['chk1'] },
    documents: [],
    signature: { alg: 'ES256', kid: 'k1', value: 'sig' },
    ...overrides,
  }
}

function makeBootstrap(overrides: Partial<OfflineBootstrap> = {}): OfflineBootstrap {
  return {
    manifest: makeManifest(),
    success: true,
    workOrders: [{ _id: 'wo1', estado: 'asignada' }],
    installations: [{ _id: 'inst1', nombre: 'Site A' }],
    assets: [{ _id: 'asset1', tipo: 'sensor' }],
    forms: [{ _id: 'form1', templateId: 'tpl1', campos: [] }],
    inventoryRefs: [{ _id: 'inv1', name: 'Part A' }],
    ...overrides,
  }
}

describe('R5 packageReadiness', () => {
  it('returns ready when all forms available', () => {
    const manifest = makeManifest({ completeness: { tpl1: { available: true, version: 1 } } })
    expect(checkPackageReadiness(manifest).ready).toBe(true)
    expect(checkPackageReadiness(manifest).missingForms).toEqual([])
  })

  it('returns not-ready with missing form ID', () => {
    const manifest = makeManifest({ completeness: { tpl1: { available: false, reason: 'FORM_NOT_DELIVERED' } } })
    const r = checkPackageReadiness(manifest)
    expect(r.ready).toBe(false)
    expect(r.missingForms).toContain('tpl1')
    expect(r.reason).toBe('FORM_NOT_DELIVERED')
  })

  it('returns not-ready for unavailable form without reason', () => {
    const manifest = makeManifest({ completeness: { tpl2: { available: false } } })
    expect(checkPackageReadiness(manifest).ready).toBe(false)
    expect(checkPackageReadiness(manifest).missingForms[0]).toContain('tpl2')
  })

  it('returns ready for empty completeness', () => {
    expect(checkPackageReadiness(makeManifest({ completeness: {} })).ready).toBe(true)
  })

  it('returns not-ready for null manifest', () => {
    expect(checkPackageReadiness(null as unknown as OfflineManifest).ready).toBe(false)
  })
})

describe('R5 packageStorage', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  it('sealAndPersistBootstrap seals all resources', async () => {
    const key = await generateStorageKey()
    const bootstrap = makeBootstrap()
    const result = await sealAndPersistBootstrap({ bootstrap, key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })
    expect(result.meta).toBeDefined()
    expect(result.meta!.packageId).toBe('pkg-1')
    expect(result.meta!.resourceCount).toBe(5) // wo + inst + asset + form + inv
    expect(result.error).toBeUndefined()
  })

  it('openPersistedBootstrap decrypts all resources', async () => {
    const key = await generateStorageKey()
    const bootstrap = makeBootstrap()
    await sealAndPersistBootstrap({ bootstrap, key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })

    const result = await openPersistedBootstrap(key, 't1', 'u1', 'dev-1', 'pkg-1')
    expect(result.error).toBeUndefined()
    expect(result.bootstrap!.workOrders).toHaveLength(1)
    expect(result.bootstrap!.workOrders[0]).toEqual({ _id: 'wo1', estado: 'asignada' })
    expect(result.bootstrap!.installations).toHaveLength(1)
    expect(result.bootstrap!.forms).toHaveLength(1)
  })

  it('openPersistedBootstrap fails on wrong identity', async () => {
    const key = await generateStorageKey()
    await sealAndPersistBootstrap({ bootstrap: makeBootstrap(), key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })

    const result = await openPersistedBootstrap(key, 't1', 'u1', 'dev-1', 'wrong-pkg')
    expect(result.error!.code).toBe('PACKAGE_NOT_FOUND')
  })

  it('clearPackageStorage removes all data', async () => {
    const key = await generateStorageKey()
    await sealAndPersistBootstrap({ bootstrap: makeBootstrap(), key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })
    await clearPackageStorage('t1', 'u1', 'dev-1', 'pkg-1')

    const result = await openPersistedBootstrap(key, 't1', 'u1', 'dev-1', 'pkg-1')
    expect(result.error!.code).toBe('PACKAGE_NOT_FOUND')
  })

  it('getPackageMeta returns manifest', async () => {
    const key = await generateStorageKey()
    await sealAndPersistBootstrap({ bootstrap: makeBootstrap(), key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })

    const meta = await getPackageMeta('t1', 'u1', 'dev-1', 'pkg-1')
    expect(meta).toBeDefined()
    expect(meta!.manifest.packageId).toBe('pkg-1')
    expect(meta!.resourceCount).toBe(5)
  })

  it('ignores delta cursor records during package discovery', async () => {
    const key = await generateStorageKey()
    await sealAndPersistBootstrap({ bootstrap: makeBootstrap(), key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })
    stores.offlinePackageMeta['pkg-1:cursor'] = { cursor: 4, updatedAt: Date.now() }
    expect(await listReadyPackages('t1', 'u1', 'dev-1')).toHaveLength(1)
  })

  it('buildPackageScopeKey is deterministic', () => {
    expect(buildPackageScopeKey('t1', 'u1', 'd1', 'p1')).toBe('t1:u1:d1:p1')
    expect(buildPackageScopeKey('t1', 'u1', 'd1', 'p2')).not.toBe(buildPackageScopeKey('t1', 'u1', 'd1', 'p1'))
  })

  it('handles bootstrap with empty resource arrays', async () => {
    const key = await generateStorageKey()
    const bootstrap = makeBootstrap({ workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [] })
    const result = await sealAndPersistBootstrap({ bootstrap, key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })
    expect(result.meta!.resourceCount).toBe(0)

    const opened = await openPersistedBootstrap(key, 't1', 'u1', 'dev-1', 'pkg-1')
    expect(opened.bootstrap!.workOrders).toEqual([])
  })

  it('handles non-array resource fields gracefully', async () => {
    const key = await generateStorageKey()
    const bootstrap = makeBootstrap({ workOrders: null as unknown as Array<Record<string, unknown>> })
    const result = await sealAndPersistBootstrap({ bootstrap, key, kid: 'k1', tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })
    expect(result.meta).toBeDefined()
  })
})

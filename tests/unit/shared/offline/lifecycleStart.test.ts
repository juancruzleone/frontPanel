/**
 * R7 — Lifecycle start: cryptographic package membership verification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// IDB mock
const stores: Record<string, Record<string, unknown>> = {}
function mkReq(result?: unknown) {
  let ok: ((e: { target: { result: unknown } }) => void) | null = null
  const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result, error: null }
  queueMicrotask(() => ok?.({ target: { result } }))
  return r
}
vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    let ok: ((e: { target: { result: unknown } }) => void) | null = null
    const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result: undefined as unknown, error: null }
    queueMicrotask(() => {
      r.result = {
        objectStoreNames: { contains: () => true },
        transaction: () => {
          const s = (name: string) => stores[name] ?? (stores[name] = {})
          const tx = {
            objectStore: (n: string) => ({
              put: vi.fn().mockImplementation((val: unknown, key?: string) => { const v = val as Record<string, unknown>; s(n)[key ?? (v.id as string) ?? 'x'] = val; return mkReq(undefined) }),
              get: vi.fn().mockImplementation((k: string) => mkReq(s(n)[k])),
              delete: vi.fn().mockImplementation((k: string) => { delete s(n)[k]; return mkReq(undefined) }),
              getAll: vi.fn().mockImplementation(() => mkReq(Object.values(s(n)))),
            }),
            oncomplete: null as unknown, onerror: null as unknown,
          }
          setTimeout(() => tx.oncomplete?.(), 0)
          return tx
        },
      }
      ok?.({ target: { result: r.result } })
    })
    return r
  }),
})

vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, sha256Hex: vi.fn().mockResolvedValue('a'.repeat(64)) }
})

// Use real envelope (seal/open) for cryptographic verification
vi.mock('../../../../src/shared/offline/envelope', async (importOriginal) => {
  return await importOriginal<typeof import('../../../../src/shared/offline/envelope')>()
})

const mockTrust = { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' as const }
const mockLease = { lease: { tenantId: 't1' }, header: { kid: 'k1' }, signature: 'sig' }

vi.mock('@/store/offlineTrustStore', () => ({ useOfflineTrustStore: { getState: () => mockTrust } }))
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({
  getStoredDevice: vi.fn().mockResolvedValue({ privateKeyHandle: {} as CryptoKey }),
}))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({ getStoredLease: vi.fn().mockResolvedValue(mockLease) }))

const { resolveStartContext, startWorkOrderOnlineOrOffline } = await import('../../../../src/shared/offline/lifecycleStart')
const { generateStorageKey } = await import('../../../../src/shared/offline/crypto')

// Seed a package with sealed work order resources using real encryption
async function seedPackageWithKey(pkgId: string, workOrders: Array<{ _id: string; [k: string]: unknown }>) {
  const { sealJson } = await import('../../../../src/shared/offline/envelope')
  const key = await generateStorageKey()
  const scopeKey = `t1:a1:dev-1:${pkgId}`

  stores.offlinePackageMeta = stores.offlinePackageMeta ?? {}
  stores.offlinePackageMeta[scopeKey] = {
    scopeKey, packageId: pkgId,
    manifest: { packageVersion: 1, packageId: pkgId },
    sealedAt: Date.now(), resourceCount: workOrders.length,
  }

  // Persist storage key
  stores.offlinePackageKeys = stores.offlinePackageKeys ?? {}
  stores.offlinePackageKeys[scopeKey] = { key, scopeKey }

  stores.offlinePackageResources = stores.offlinePackageResources ?? {}
  for (const wo of workOrders) {
    const resKey = `${scopeKey}:workOrders:${wo._id}`
    const envelope = await sealJson({ key, kid: 'k1', scopeKey, store: 'workOrders', value: wo })
    stores.offlinePackageResources[resKey] = {
      id: resKey, kind: 'workOrders', entityId: wo._id, packageId: pkgId, scopeKey, envelope,
    }
  }
  return key
}

describe('R7 lifecycleStart cryptographic verification', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  it('uses the online API before offline storage is needed', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    const onlineFn = vi.fn().mockResolvedValue({})
    const result = await startWorkOrderOnlineOrOffline('wo-online', {} as never, onlineFn)
    expect(result.status).toBe('accepted')
    expect(onlineFn).toHaveBeenCalledWith('wo-online')
  })

  it('resolves package by decrypting and verifying workOrderId', async () => {
    await seedPackageWithKey('pkg-1', [{ _id: 'wo-other' }])
    const storageKey = await seedPackageWithKey('pkg-2', [{ _id: 'wo-target' }, { _id: 'wo-another' }])

    const r = await resolveStartContext('t1', 'a1', 'wo-target')
    expect(r.ctx).toBeDefined()
    expect(r.ctx!.packageId).toBe('pkg-2')
    expect(r.ctx!.key).toBe(storageKey)
  })

  it('rejects forged outer entityId — decrypted _id does not match', async () => {
    // Package has resource with entityId hint "wo-forged" but decrypted _id is "wo-real"
    const key = await generateStorageKey()
    const { sealJson } = await import('../../../../src/shared/offline/envelope')
    const scopeKey = 't1:a1:dev-1:pkg-forged'

    stores.offlinePackageMeta = { [scopeKey]: { scopeKey, packageId: 'pkg-forged', manifest: { packageVersion: 1, packageId: 'pkg-forged' }, sealedAt: Date.now(), resourceCount: 1 } }
    stores.offlinePackageKeys = { [scopeKey]: { key, scopeKey } }
    const envelope = await sealJson({ key, kid: 'k1', scopeKey, store: 'workOrders', value: { _id: 'wo-real' } })
    stores.offlinePackageResources = {
      [`${scopeKey}:workOrders:wo-forged`]: { id: `${scopeKey}:workOrders:wo-forged`, kind: 'workOrders', entityId: 'wo-forged', packageId: 'pkg-forged', scopeKey, envelope },
    }

    // Request workOrderId="wo-forged" — entityId hint matches but decrypted _id is "wo-real"
    const r = await resolveStartContext('t1', 'a1', 'wo-forged')
    expect(r.ctx).toBeUndefined()
    expect(r.error).toBe('offline_unavailable')
  })

  it('rejects tampered envelope — ciphertext corrupted', async () => {
    const key = await generateStorageKey()
    const { sealJson } = await import('../../../../src/shared/offline/envelope')
    const scopeKey = 't1:a1:dev-1:pkg-tamper'

    stores.offlinePackageMeta = { [scopeKey]: { scopeKey, packageId: 'pkg-tamper', manifest: { packageVersion: 1, packageId: 'pkg-tamper' }, sealedAt: Date.now(), resourceCount: 1 } }
    stores.offlinePackageKeys = { [scopeKey]: { key, scopeKey } }
    const envelope = await sealJson({ key, kid: 'k1', scopeKey, store: 'workOrders', value: { _id: 'wo1' } })
    // Corrupt the ciphertext
    envelope.ct = envelope.ct.split('').reverse().join('')
    stores.offlinePackageResources = {
      [`${scopeKey}:workOrders:wo1`]: { id: `${scopeKey}:workOrders:wo1`, kind: 'workOrders', entityId: 'wo1', packageId: 'pkg-tamper', scopeKey, envelope },
    }

    const r = await resolveStartContext('t1', 'a1', 'wo1')
    expect(r.ctx).toBeUndefined()
    expect(r.error).toBe('offline_unavailable')
  })

  it('rejects wrong scope — envelope sealed for different owner', async () => {
    const key = await generateStorageKey()
    const { sealJson } = await import('../../../../src/shared/offline/envelope')
    const correctScope = 't1:a1:dev-1:pkg-scope'
    const wrongScope = 'OTHER:a1:dev-1:pkg-scope'

    stores.offlinePackageMeta = { [correctScope]: { scopeKey: correctScope, packageId: 'pkg-scope', manifest: { packageVersion: 1, packageId: 'pkg-scope' }, sealedAt: Date.now(), resourceCount: 1 } }
    stores.offlinePackageKeys = { [correctScope]: { key, scopeKey: correctScope } }
    // Seal with wrong scope
    const envelope = await sealJson({ key, kid: 'k1', scopeKey: wrongScope, store: 'workOrders', value: { _id: 'wo1' } })
    stores.offlinePackageResources = {
      [`${correctScope}:workOrders:wo1`]: { id: `${correctScope}:workOrders:wo1`, kind: 'workOrders', entityId: 'wo1', packageId: 'pkg-scope', scopeKey: correctScope, envelope },
    }

    const r = await resolveStartContext('t1', 'a1', 'wo1')
    expect(r.ctx).toBeUndefined()
    expect(r.error).toBe('offline_unavailable')
  })

  it('fails closed when no package contains the workOrderId', async () => {
    await seedPackageWithKey('pkg-1', [{ _id: 'wo-other' }])
    const r = await resolveStartContext('t1', 'a1', 'wo-missing')
    expect(r.error).toBe('offline_unavailable')
  })

  it('fails closed when work order in multiple packages (ambiguous)', async () => {
    await seedPackageWithKey('pkg-1', [{ _id: 'wo-shared' }])
    await seedPackageWithKey('pkg-2', [{ _id: 'wo-shared' }])
    const r = await resolveStartContext('t1', 'a1', 'wo-shared')
    expect(r.error).toBe('offline_unavailable')
  })

  it('fails closed when no packages exist', async () => {
    expect((await resolveStartContext('t1', 'a1', 'wo1')).error).toBe('offline_unavailable')
  })

  it('fails closed when trust not ready', async () => {
    mockTrust.isOfflineReady = false
    expect((await resolveStartContext('t1', 'a1', 'wo1')).error).toBe('offline_unavailable')
    mockTrust.isOfflineReady = true
  })

  it('fails closed when no storage key persisted', async () => {
    // Seed package metadata but no key
    stores.offlinePackageMeta = { 't1:a1:dev-1:pkg-nokey': { scopeKey: 't1:a1:dev-1:pkg-nokey', packageId: 'pkg-nokey', manifest: {}, sealedAt: Date.now(), resourceCount: 1 } }
    stores.offlinePackageResources = { 't1:a1:dev-1:pkg-nokey:workOrders:wo1': { id: 'x', kind: 'workOrders', entityId: 'wo1', packageId: 'pkg-nokey', scopeKey: 't1:a1:dev-1:pkg-nokey', envelope: { v: 4 } } }
    expect((await resolveStartContext('t1', 'a1', 'wo1')).error).toBe('offline_unavailable')
  })
})

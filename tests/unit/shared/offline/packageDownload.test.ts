/**
 * R4/R5 — Package download orchestration tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────────────
const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

// IDB mock with transaction completion
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
            oncomplete: null as unknown,
            onerror: null as unknown,
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

// Trust store mock — set isOfflineReady
vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: {
    getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }),
  },
}))

const { downloadPackage } = await import('../../../../src/shared/offline/packageDownload')
const { canonicalJSON, sha256Hex, generateDeviceKeyPair } = await import('../../../../src/shared/offline/crypto')
const { PACKAGE_SCHEMA_VERSION } = await import('../../../../src/shared/offline/packageTypes')
import type { OfflineManifest } from '../../../../src/shared/offline/packageTypes'

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

async function makeSignedManifest(claims: Record<string, unknown>): Promise<{ manifest: Record<string, unknown>; publicKeyJwk: JsonWebKey }> {
  const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
  const canonical = canonicalJSON(claims)
  const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonical))
  const value = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return { manifest: { ...claims, signature: { alg: 'ES256', kid: 'k1', value } }, publicKeyJwk }
}

describe('R4/R5 packageDownload', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    for (const k of Object.keys(stores)) delete stores[k]
  })

  it('downloads, verifies, seals, and persists a valid package', async () => {
    const wo = { _id: 'wo1', estado: 'asignada' }
    const woChecksum = await sha256Hex(new TextEncoder().encode(canonicalJSON(wo)))
    const claims = {
      schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
      packageId: 'pkg-ok', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
      binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
      cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(), revocationEpoch: 0,
      limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
      completeness: {},
      resourceChecksums: { workOrders: [woChecksum] },
      documents: [],
    }
    const { manifest, publicKeyJwk } = await makeSignedManifest(claims)

    // 1. preparePackage
    fetchSpy.mockResolvedValueOnce(json({ success: true, manifest, workOrders: [wo], installations: [], assets: [], forms: [], inventoryRefs: [] }))
    // 2. verification keys
    fetchSpy.mockResolvedValueOnce(json({ keys: [{ ...publicKeyJwk, kid: 'k1' }] }))

    const result = await downloadPackage()
    expect(result.status).toBe('success')
    expect(result.packageId).toBe('pkg-ok')
  })

  it('returns no_trust when trust store not ready', async () => {
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: false, deviceId: null, leaseStatus: 'none', lastVerifiedAt: null, setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
    const result = await downloadPackage()
    expect(result.status).toBe('no_trust')
    // Restore
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid', lastVerifiedAt: Date.now(), setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
  })

  it('returns prepare_failed on backend error', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Not found', code: 'PACKAGE_NOT_FOUND' } }, 404))
    const result = await downloadPackage()
    expect(result.status).toBe('prepare_failed')
    expect(result.error).toContain('PACKAGE_NOT_FOUND')
  })

  it('returns verify_failed on tampered manifest', async () => {
    fetchSpy.mockResolvedValueOnce(json({
      success: true,
      manifest: { schemaVersion: 1, packageId: 'p', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1', binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' }, cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(), revocationEpoch: 0, limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 }, completeness: {}, resourceChecksums: {}, documents: [], signature: { alg: 'ES256', kid: 'k1', value: 'bad' } },
      workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [],
    }))
    fetchSpy.mockResolvedValueOnce(json({ keys: [{ kid: 'k1', kty: 'EC', crv: 'P-256', x: 'a', y: 'b' }] }))
    const result = await downloadPackage()
    expect(result.status).toBe('verify_failed')
  })

  it('returns checksum_failed on resource mismatch', async () => {
    const wo = { _id: 'wo1', estado: 'asignada' }
    const wrongChecksum = '0'.repeat(64)
    const claims = {
      schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
      packageId: 'pkg-bad', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
      binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
      cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(), revocationEpoch: 0,
      limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
      completeness: {},
      resourceChecksums: { workOrders: [wrongChecksum] },
      documents: [],
    }
    const { manifest, publicKeyJwk } = await makeSignedManifest(claims)
    fetchSpy.mockResolvedValueOnce(json({ success: true, manifest, workOrders: [wo], installations: [], assets: [], forms: [], inventoryRefs: [] }))
    fetchSpy.mockResolvedValueOnce(json({ keys: [{ ...publicKeyJwk, kid: 'k1' }] }))
    const result = await downloadPackage()
    expect(result.status).toBe('checksum_failed')
    expect(result.error).toContain('workOrders')
  })

  it('returns not_ready when forms missing', async () => {
    const claims = {
      schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
      packageId: 'pkg-form', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
      binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
      cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(), revocationEpoch: 0,
      limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
      completeness: { tpl1: { available: false, reason: 'FORM_NOT_DELIVERED' } },
      resourceChecksums: {},
      documents: [],
    }
    const { manifest, publicKeyJwk } = await makeSignedManifest(claims)
    fetchSpy.mockResolvedValueOnce(json({ success: true, manifest, workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [] }))
    fetchSpy.mockResolvedValueOnce(json({ keys: [{ ...publicKeyJwk, kid: 'k1' }] }))
    const result = await downloadPackage()
    expect(result.status).toBe('not_ready')
    expect(result.missingForms).toContain('tpl1')
  })

  it('returns verify_failed on expired manifest', async () => {
    const claims = {
      schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
      packageId: 'pkg-exp', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
      binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
      cursor: 0, expiresAt: new Date(Date.now() - 1000).toISOString(), revocationEpoch: 0,
      limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
      completeness: {}, resourceChecksums: {}, documents: [],
    }
    const { manifest, publicKeyJwk } = await makeSignedManifest(claims)
    fetchSpy.mockResolvedValueOnce(json({ success: true, manifest, workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [] }))
    fetchSpy.mockResolvedValueOnce(json({ keys: [{ ...publicKeyJwk, kid: 'k1' }] }))
    const result = await downloadPackage()
    expect(result.status).toBe('verify_failed')
    expect(result.error).toBe('expired')
  })
})

/**
 * R3 — Package verification + service: manifest verify, prepare, delta.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

const { verifyManifest } = await import('../../../../src/shared/offline/packageVerify')
const { preparePackage, getDelta } = await import('../../../../src/shared/offline/packageService')
const { canonicalJSON, generateDeviceKeyPair, signCanonical } = await import('../../../../src/shared/offline/crypto')
import type { VerificationKey } from '../../../../src/shared/offline/crypto'
import type { OfflineManifest, OfflineManifestClaim, OfflineManifestSignature } from '../../../../src/shared/offline/packageTypes'
import { PACKAGE_SCHEMA_VERSION } from '../../../../src/shared/offline/packageTypes'

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function makeClaims(overrides: Partial<OfflineManifestClaim> = {}): OfflineManifestClaim {
  return {
    schemaVersion: PACKAGE_SCHEMA_VERSION, serverTime: new Date().toISOString(),
    packageId: 'pkg-1', packageVersion: 1, deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
    binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
    cursor: 0, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), revocationEpoch: 0,
    limits: { maxDeltaSize: 100, maxPackageSizeMB: 50 },
    completeness: {}, resourceChecksums: {}, documents: [],
    ...overrides,
  }
}

async function signManifest(claims: OfflineManifestClaim, kid = 'k1'): Promise<{ manifest: OfflineManifest; publicKeyJwk: JsonWebKey }> {
  const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
  const canonical = canonicalJSON(claims)
  const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonical))
  const value = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return { manifest: { ...claims, signature: { alg: 'ES256', kid, value } }, publicKeyJwk }
}

describe('R3 packageVerify', () => {
  it('verifies valid manifest signature', async () => {
    const claims = makeClaims()
    const { manifest, publicKeyJwk } = await signManifest(claims)
    const keySet: VerificationKey[] = [{ ...publicKeyJwk, kid: 'k1' } as unknown as VerificationKey]
    expect((await verifyManifest(manifest, keySet, { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).ok).toBe(true)
  })

  it('rejects tampered claims', async () => {
    const claims = makeClaims()
    const { manifest, publicKeyJwk } = await signManifest(claims)
    const tampered = { ...manifest, tenantId: 'hacked' }
    const keySet: VerificationKey[] = [{ ...publicKeyJwk, kid: 'k1' } as unknown as VerificationKey]
    expect((await verifyManifest(tampered, keySet, { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('invalid_signature')
  })

  it('rejects wrong schema version', async () => {
    const manifest = { ...makeClaims({ schemaVersion: 99 }), signature: { alg: 'ES256', kid: 'k1', value: 'x' } } as OfflineManifest
    expect((await verifyManifest(manifest, [], { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('invalid_schema_version')
  })

  it('rejects unknown kid', async () => {
    const manifest = { ...makeClaims(), signature: { alg: 'ES256', kid: 'unknown', value: 'x' } } as OfflineManifest
    expect((await verifyManifest(manifest, [], { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('no_verification_keys')
  })

  it('rejects binding mismatch', async () => {
    const claims = makeClaims()
    const { manifest, publicKeyJwk } = await signManifest(claims)
    const keySet: VerificationKey[] = [{ ...publicKeyJwk, kid: 'k1' } as unknown as VerificationKey]
    expect((await verifyManifest(manifest, keySet, { tenantId: 'other', userId: 'u1', deviceId: 'dev-1' })).status).toBe('binding_mismatch')
  })

  it('rejects expired manifest', async () => {
    const claims = makeClaims({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    const { manifest, publicKeyJwk } = await signManifest(claims)
    const keySet: VerificationKey[] = [{ ...publicKeyJwk, kid: 'k1' } as unknown as VerificationKey]
    expect((await verifyManifest(manifest, keySet, { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('expired')
  })

  it('rejects null manifest', async () => {
    expect((await verifyManifest(null as unknown as OfflineManifest, [], { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('malformed')
  })

  it('rejects missing signature', async () => {
    expect((await verifyManifest(makeClaims() as OfflineManifest, [], { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' })).status).toBe('malformed')
  })
})

describe('R3 packageService', () => {
  beforeEach(() => { fetchSpy.mockReset() })

  describe('preparePackage', () => {
    it('POST /packages/prepare with deviceId', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, manifest: { schemaVersion: 1, packageId: 'p1', signature: { alg: 'ES256', kid: 'k1', value: 'v' } }, workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [] }))
      const r = await preparePackage('dev-1')
      expect(r.bootstrap!.manifest.schemaVersion).toBe(1)
      expect(r.bootstrap!.manifest.signature.kid).toBe('k1')
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/packages/prepare')
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).deviceId).toBe('dev-1')
    })

    it('passes orderId when provided', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, manifest: { schemaVersion: 1, signature: { alg: 'ES256', kid: 'k1', value: 'v' } }, workOrders: [] }))
      await preparePackage('dev-1', 'order-1')
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).orderId).toBe('order-1')
    })

    it('returns error on 404 PACKAGE_NOT_FOUND', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Not found', code: 'PACKAGE_NOT_FOUND' } }, 404))
      expect((await preparePackage('dev-1')).error!.code).toBe('PACKAGE_NOT_FOUND')
    })

    it('returns error on 410 PACKAGE_EXPIRED', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Expired', code: 'PACKAGE_EXPIRED' } }, 410))
      expect((await preparePackage('dev-1')).error!.code).toBe('PACKAGE_EXPIRED')
    })

    it('normalizes flat backend response (signature at top level)', async () => {
      // Backend shape: manifest claims at top-level + signature sibling
      fetchSpy.mockResolvedValueOnce(json({
        success: true,
        schemaVersion: 1, packageId: 'p1', packageVersion: 1,
        deviceId: 'dev-1', userId: 'u1', tenantId: 't1',
        binding: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' },
        cursor: 0, expiresAt: new Date(Date.now() + 86400000).toISOString(),
        signature: { alg: 'ES256', kid: 'k1', value: 'v' },
        workOrders: [{ _id: 'wo1' }],
      }))
      const r = await preparePackage('dev-1')
      expect(r.bootstrap!.manifest.signature.kid).toBe('k1')
      expect(r.bootstrap!.workOrders).toHaveLength(1)
    })
  })

  describe('getDelta', () => {
    it('POST /packages/delta with exact body', async () => {
      fetchSpy.mockResolvedValueOnce(json({ packageId: 'p1', deviceId: 'dev-1', deltas: [], nextCursor: 0, hasMore: false }))
      const r = await getDelta('p1', 'dev-1', 0)
      expect(r.delta!.deltas).toEqual([])
      expect(r.delta!.hasMore).toBe(false)
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.packageId).toBe('p1')
      expect(body.clientCursor).toBe(0)
    })

    it('passes limit when provided', async () => {
      fetchSpy.mockResolvedValueOnce(json({ packageId: 'p1', deviceId: 'dev-1', deltas: [], nextCursor: 0, hasMore: false }))
      await getDelta('p1', 'dev-1', 5, 50)
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).limit).toBe(50)
    })

    it('returns error on 410 CURSOR_EXPIRED', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Cursor expired', code: 'CURSOR_EXPIRED' } }, 410))
      expect((await getDelta('p1', 'dev-1', 0)).error!.code).toBe('CURSOR_EXPIRED')
    })
  })
})

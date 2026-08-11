/**
 * R2b — Lease gate: refresh, signature verification, status check.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

// IDB mock
interface MockRec { [k: string]: unknown }
const dbStore: Record<string, MockRec> = {}
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
        transaction: () => ({ objectStore: () => ({
          put: vi.fn().mockImplementation((val: MockRec, key: string) => { dbStore[key] = val; return mkReq(undefined) }),
          get: vi.fn().mockImplementation((k: string) => mkReq(dbStore[k])),
          delete: vi.fn().mockImplementation((k: string) => { delete dbStore[k]; return mkReq(undefined) }),
        }) }),
      }
      ok?.({ target: { result: r.result } })
    })
    return r
  }),
})

const { refreshLease, checkLeaseStatus, verifyLeaseSignature, verifyLease, getStoredLease, clearStoredLease, fetchVerificationKeys } =
  await import('../../../../src/shared/offline/leaseGate')
const { canonicalJSON, generateDeviceKeyPair, importVerificationKey, verifyCanonicalSignature } =
  await import('../../../../src/shared/offline/crypto')
import type { OfflineLeaseClaim } from '../../../../src/shared/offline/types'

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function makeLease(overrides: Partial<OfflineLeaseClaim> = {}): OfflineLeaseClaim {
  return {
    schemaVersion: 1, tenantId: 't1', userId: 'u1', deviceId: 'd1',
    role: 'tecnico', permissions: ['offline:read', 'offline:write'],
    issuedAt: new Date().toISOString(), lastVerifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    ...overrides,
  }
}

describe('R2b leaseGate', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    for (const k of Object.keys(dbStore)) delete dbStore[k]
  })

  describe('refreshLease', () => {
    it('calls POST /lease/refresh and persists lease', async () => {
      const lease = makeLease()
      fetchSpy.mockResolvedValueOnce(json({ success: true, lease, header: { alg: 'ES256', kid: 'k1' }, signature: 'sig123' }))

      const r = await refreshLease('d1')
      expect(r.stored!.lease.tenantId).toBe('t1')
      expect(r.stored!.header.kid).toBe('k1')
      expect(r.stored!.signature).toBe('sig123')
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/lease/refresh')
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).deviceId).toBe('d1')
    })

    it('returns error on 403 DEVICE_REVOKED', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Revoked', code: 'DEVICE_REVOKED' } }, 403))
      expect((await refreshLease('d1')).error!.code).toBe('DEVICE_REVOKED')
    })

    it('returns error on 401 MISSING_SESSION', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'No session', code: 'MISSING_SESSION' } }, 401))
      expect((await refreshLease('d1')).error!.code).toBe('MISSING_SESSION')
    })
  })

  describe('checkLeaseStatus', () => {
    it('returns valid for non-expired matching lease', () => {
      expect(checkLeaseStatus(makeLease(), { tenantId: 't1', userId: 'u1', deviceId: 'd1' })).toBe('valid')
    })
    it('returns expired for past expiresAt', () => {
      expect(checkLeaseStatus(makeLease({ expiresAt: new Date(Date.now() - 1000).toISOString() }), { tenantId: 't1', userId: 'u1', deviceId: 'd1' })).toBe('expired')
    })
    it('returns revoked for tenant mismatch', () => {
      expect(checkLeaseStatus(makeLease(), { tenantId: 'other', userId: 'u1', deviceId: 'd1' })).toBe('revoked')
    })
    it('returns revoked for userId mismatch', () => {
      expect(checkLeaseStatus(makeLease(), { tenantId: 't1', userId: 'other', deviceId: 'd1' })).toBe('revoked')
    })
    it('returns revoked for deviceId mismatch', () => {
      expect(checkLeaseStatus(makeLease(), { tenantId: 't1', userId: 'u1', deviceId: 'other' })).toBe('revoked')
    })
    it('returns unknown for null lease', () => {
      expect(checkLeaseStatus(null as unknown as OfflineLeaseClaim, { tenantId: 't1', userId: 'u1', deviceId: 'd1' })).toBe('unknown')
    })
    it('returns expired for malformed expiresAt', () => {
      expect(checkLeaseStatus(makeLease({ expiresAt: 'not-a-date' }), { tenantId: 't1', userId: 'u1', deviceId: 'd1' })).toBe('expired')
    })
  })

  describe('verifyLeaseSignature', () => {
    it('verifies a real P-256 signature over canonical lease', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      const lease = makeLease()
      const canonical = canonicalJSON(lease)
      const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonical))
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const keySet = [{ ...publicKeyJwk, kid: 'k1' }] as import('../../../../src/shared/offline/crypto').VerificationKey[]
      expect(await verifyLeaseSignature(lease, sigB64, 'k1', keySet)).toBe(true)
    })

    it('rejects tampered lease', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      const lease = makeLease()
      const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON(lease)))
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const keySet = [{ ...publicKeyJwk, kid: 'k1' }] as import('../../../../src/shared/offline/crypto').VerificationKey[]
      expect(await verifyLeaseSignature(makeLease({ tenantId: 'tampered' }), sigB64, 'k1', keySet)).toBe(false)
    })

    it('returns false for unknown kid', async () => {
      expect(await verifyLeaseSignature(makeLease(), 'sig', 'unknown', [])).toBe(false)
    })
  })

  describe('verifyLease (full)', () => {
    it('returns valid for correct signature + binding + not expired', async () => {
      const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
      const lease = makeLease()
      const sigBuf = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(canonicalJSON(lease)))
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const stored = { lease, header: { alg: 'ES256', kid: 'k1' }, signature: sigB64, storedAt: Date.now() }
      const keySet = [{ ...publicKeyJwk, kid: 'k1' }] as import('../../../../src/shared/offline/crypto').VerificationKey[]

      const r = await verifyLease(stored, keySet, { tenantId: 't1', userId: 'u1', deviceId: 'd1' })
      expect(r.valid).toBe(true)
    })

    it('returns LEASE_EXPIRED for expired lease', async () => {
      const lease = makeLease({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      const stored = { lease, header: { alg: 'ES256', kid: 'k1' }, signature: 'sig', storedAt: Date.now() }
      const r = await verifyLease(stored, [], { tenantId: 't1', userId: 'u1', deviceId: 'd1' })
      expect(r.valid).toBe(false)
      expect((r as { valid: false; code: string }).code).toBe('LEASE_EXPIRED')
    })

    it('returns OWNERSHIP_MISMATCH for binding mismatch', async () => {
      const lease = makeLease()
      const stored = { lease, header: { alg: 'ES256', kid: 'k1' }, signature: 'sig', storedAt: Date.now() }
      const r = await verifyLease(stored, [], { tenantId: 'other', userId: 'u1', deviceId: 'd1' })
      expect(r.valid).toBe(false)
      expect((r as { valid: false; code: string }).code).toBe('OWNERSHIP_MISMATCH')
    })

    it('returns INVALID_SIGNATURE for bad signature', async () => {
      const lease = makeLease()
      const stored = { lease, header: { alg: 'ES256', kid: 'k1' }, signature: 'bad', storedAt: Date.now() }
      const r = await verifyLease(stored, [{ kid: 'k1', kty: 'EC', crv: 'P-256', x: 'a', y: 'b' }], { tenantId: 't1', userId: 'u1', deviceId: 'd1' })
      expect(r.valid).toBe(false)
      expect((r as { valid: false; code: string }).code).toBe('INVALID_SIGNATURE')
    })
  })

  describe('getStoredLease / clearStoredLease', () => {
    it('stores and retrieves lease', async () => {
      const lease = makeLease()
      fetchSpy.mockResolvedValueOnce(json({ success: true, lease, header: { alg: 'ES256', kid: 'k1' }, signature: 's' }))
      await refreshLease('d1')
      const stored = await getStoredLease()
      expect(stored!.lease.tenantId).toBe('t1')
    })

    it('clears stored lease', async () => {
      dbStore['current'] = { lease: makeLease() }
      await clearStoredLease()
      expect(dbStore['current']).toBeUndefined()
    })
  })

  describe('fetchVerificationKeys', () => {
    it('fetches key set from backend', async () => {
      fetchSpy.mockResolvedValueOnce(json({ keys: [{ kid: 'k1', kty: 'EC', crv: 'P-256', x: 'a', y: 'b' }] }))
      const r = await fetchVerificationKeys()
      expect(r.keys).toHaveLength(1)
      expect(r.keys![0].kid).toBe('k1')
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/verification-keys')
    })

    it('returns error on failure', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'fail', code: 'ERR' } }, 500))
      expect((await fetchVerificationKeys()).error!.code).toBe('ERR')
    })
  })
})

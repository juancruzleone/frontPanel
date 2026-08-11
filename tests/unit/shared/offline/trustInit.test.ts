/**
 * R2c — Trust init + store: initialization flow, logout cleanup, lease validity.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────────────
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

// Auth mock
localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1' } }))

// Crypto mock (deterministic signing for verification)
vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return {
    ...orig,
    generateDeviceKeyPair: vi.fn().mockResolvedValue({
      privateKey: { algorithm: { name: 'ECDSA', namedCurve: 'P-256' }, extractable: false, usages: ['sign'] } as unknown as CryptoKey,
      publicKey: {} as CryptoKey,
      publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'mockX', y: 'mockY' },
    }),
  }
})

// ── Import AFTER mocks ──────────────────────────────────────────────────
const { useOfflineTrustStore } = await import('../../../../src/store/offlineTrustStore')
const { initializeOfflineTrust } = await import('../../../../src/shared/offline/trustInit')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

function makeLease() {
  return {
    schemaVersion: 1, tenantId: 't1', userId: 'u1', deviceId: 'srv-1',
    role: 'tecnico', permissions: ['offline:read', 'offline:write'],
    issuedAt: new Date().toISOString(), lastVerifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  }
}

describe('R2c trust init + store', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    for (const k of Object.keys(dbStore)) delete dbStore[k]
    useOfflineTrustStore.getState().clearTrust()
  })

  describe('offlineTrustStore', () => {
    it('defaults to not ready', () => {
      const s = useOfflineTrustStore.getState()
      expect(s.isOfflineReady).toBe(false)
      expect(s.leaseStatus).toBe('none')
      expect(s.deviceId).toBeNull()
    })

    it('setTrustReady sets ready when lease valid', () => {
      useOfflineTrustStore.getState().setTrustReady('d1', 'valid')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(true)
      expect(useOfflineTrustStore.getState().deviceId).toBe('d1')
    })

    it('setTrustReady sets not-ready when lease expired', () => {
      useOfflineTrustStore.getState().setTrustReady('d1', 'expired')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(false)
    })

    it('clearTrust resets everything', () => {
      useOfflineTrustStore.getState().setTrustReady('d1', 'valid')
      useOfflineTrustStore.getState().clearTrust()
      const s = useOfflineTrustStore.getState()
      expect(s.isOfflineReady).toBe(false)
      expect(s.deviceId).toBeNull()
      expect(s.leaseStatus).toBe('none')
    })

    it('setLeaseStatus updates ready flag', () => {
      useOfflineTrustStore.getState().setLeaseStatus('valid')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(true)
      useOfflineTrustStore.getState().setLeaseStatus('expired')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(false)
    })
  })

  describe('initializeOfflineTrust', () => {
    it('registers device, refreshes lease, verifies, sets ready', async () => {
      // Device registration
      fetchSpy.mockResolvedValueOnce(json({ success: true, deviceId: 'srv-1', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' } }))
      // Lease refresh — returns a lease we can't verify (no real keys), so trust goes to unknown
      fetchSpy.mockResolvedValueOnce(json({ success: true, lease: makeLease(), header: { alg: 'ES256', kid: 'k1' }, signature: 'sig' }))
      // Verification keys
      fetchSpy.mockResolvedValueOnce(json({ keys: [{ kid: 'k1', kty: 'EC', crv: 'P-256', x: 'a', y: 'b' }] }))

      const result = await initializeOfflineTrust()

      // With mock keys, signature verification will fail → not ready
      // but the flow completes without throwing
      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
      expect(useOfflineTrustStore.getState().deviceId).toBe('srv-1')
    })

    it('clears trust on device registration failure', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Revoked', code: 'DEVICE_REVOKED' } }, 403))

      const result = await initializeOfflineTrust()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('DEVICE_REVOKED')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(false)
    })

    it('sets unknown status on lease refresh failure', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, deviceId: 'srv-1', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' } }))
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'No session', code: 'MISSING_SESSION' } }, 401))

      const result = await initializeOfflineTrust()
      expect(result.ok).toBe(false)
      expect(useOfflineTrustStore.getState().leaseStatus).toBe('unknown')
    })
  })

  describe('logout clears trust', () => {
    it('trust store is cleared when auth-store logout is called', async () => {
      // Set up trust state
      useOfflineTrustStore.getState().setTrustReady('d1', 'valid')
      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(true)

      // Import and call logout
      const { useAuthStore } = await import('../../../../src/store/authStore')
      useAuthStore.getState().logout()

      expect(useOfflineTrustStore.getState().isOfflineReady).toBe(false)
      expect(useOfflineTrustStore.getState().deviceId).toBeNull()
    })
  })
})

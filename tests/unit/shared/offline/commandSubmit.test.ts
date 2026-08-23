/**
 * R6b — Command submission: sign, submit, receipt lookup, error classification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

// Trust store mock
vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: { getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }) },
}))

// Device trust mock — return a mock CryptoKey with sign capability
const mockPrivateKey = {
  algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
  extractable: false,
  usages: ['sign'],
}
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({
  getStoredDevice: vi.fn().mockResolvedValue({
    deviceId: 'dev-1', tenantId: 't1', userId: 'a1',
    publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' },
    privateKeyHandle: mockPrivateKey,
    status: 'active', registeredAt: Date.now(),
  }),
}))

// Lease gate mock
vi.mock('../../../../src/shared/offline/leaseGate', () => ({
  getStoredLease: vi.fn().mockResolvedValue({
    lease: { schemaVersion: 1, tenantId: 't1', userId: 'a1', deviceId: 'dev-1', role: 'tecnico', permissions: ['offline:read'], issuedAt: '2025-01-01', lastVerifiedAt: '2025-01-01', expiresAt: '2025-12-31' },
    header: { alg: 'ES256', kid: 'k1' },
    signature: 'lease-sig',
    storedAt: Date.now(),
  }),
}))

// Mock crypto.subtle.sign to work with mock key
const origSign = crypto.subtle.sign.bind(crypto.subtle)
vi.spyOn(crypto.subtle, 'sign').mockImplementation(async (algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey, data: BufferSource) => {
  // Use real sign if key is real CryptoKey, otherwise return mock signature
  try { return await origSign(algorithm, key, data) } catch { return new Uint8Array(64).fill(0x42).buffer }
})

const { submitCommand, getCommandResult, buildCommandCanonicalBytes } = await import('../../../../src/shared/offline/commandSubmit')

const json = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body,
})

describe('R6b commandSubmit', () => {
  beforeEach(() => { fetchSpy.mockReset() })

  describe('buildCommandCanonicalBytes', () => {
    it('produces deterministic canonical JSON', () => {
      const a = buildCommandCanonicalBytes({ tenantId: 't1', actorId: 'a1', deviceId: 'd1', packageId: 'p1', commandId: 'c1', commandType: 'start', schemaVersion: 1, expectedEntityVersion: 1, payloadHash: 'abc123' })
      const b = buildCommandCanonicalBytes({ tenantId: 't1', actorId: 'a1', deviceId: 'd1', packageId: 'p1', commandId: 'c1', commandType: 'start', schemaVersion: 1, expectedEntityVersion: 1, payloadHash: 'abc123' })
      expect(a).toBe(b)
    })

    it('sorts dependsOn', () => {
      const c = buildCommandCanonicalBytes({ tenantId: 't1', actorId: 'a1', deviceId: 'd1', packageId: 'p1', commandId: 'c1', commandType: 'start', schemaVersion: 1, expectedEntityVersion: 1, payloadHash: 'h', dependsOn: ['z', 'a', 'm'] })
      expect(c).toContain('"dependsOn":["a","m","z"]')
    })

    it('nulls out missing optional fields', () => {
      const c = buildCommandCanonicalBytes({ tenantId: 't1', actorId: 'a1', deviceId: 'd1', packageId: 'p1', commandId: 'c1', commandType: 'start', schemaVersion: 1, expectedEntityVersion: 1, payloadHash: 'h' })
      expect(c).toContain('"expectedFormVersion":null')
      expect(c).toContain('"dependsOn":[]')
    })
  })

  describe('submitCommand', () => {
    const params = {
      commandId: 'c1', commandType: 'start' as const, packageId: 'pkg1',
      entityId: 'e1', payload: { orderId: 'o1' }, payloadHash: 'a'.repeat(64),
      expectedEntityVersion: 1,
    }
    const receipt = (overrides: Record<string, unknown> = {}) => ({
      commandId: 'c1', commandType: 'start', tenantId: 't1', actorId: 'a1',
      deviceId: 'dev-1', packageId: 'pkg1', entityId: 'e1',
      payloadHash: 'a'.repeat(64), status: 'succeeded',
      ...overrides,
    })

    it('signs and submits to POST /packages/:packageId/commands', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: receipt() }))

      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('submitted')
      expect(r.receipt!.commandId).toBe('c1')

      const [url, opts] = fetchSpy.mock.calls[0]
      expect(url).toBe('/api/offline/packages/pkg1/commands')
      expect(opts.method).toBe('POST')
      const body = JSON.parse(opts.body)
      expect(body.commandId).toBe('c1')
      expect(body.type).toBe('start')
      expect(body.deviceSignature).toBeDefined()
      expect(body.lease).toBeDefined()
    })

    it('keeps a generic 409 actionable when durable result is unavailable', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Conflict' } }, 409))
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Unavailable' } }, 503))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('receipt_error')
      expect(r.receipt).toBeUndefined()
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('keeps IDEMPOTENCY_KEY_REUSED actionable when durable result is transient', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Reused', code: 'IDEMPOTENCY_KEY_REUSED' } }, 409))
      fetchSpy.mockRejectedValueOnce(new Error('offline'))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('receipt_error')
      expect(r.receipt).toBeUndefined()
    })

    it('accepts a valid durable receipt after a receiptless reuse', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Reused', code: 'IDEMPOTENCY_KEY_REUSED' } }, 409))
      fetchSpy.mockResolvedValueOnce(json({ receipt: receipt({ idempotentReplay: true }) }))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('idempotent_replay')
      expect(r.receipt?.payloadHash).toBe(params.payloadHash)
      expect(fetchSpy.mock.calls[1][0]).toBe('/api/offline/commands/c1?commandType=start')
    })

    it('rejects a mismatched durable receipt after a generic conflict', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Conflict' } }, 409))
      fetchSpy.mockResolvedValueOnce(json({ receipt: receipt({ commandId: 'other' }) }))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('receipt_error')
      expect(r.receipt).toBeUndefined()
    })

    it('accepts a contract-matching idempotent replay receipt', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: receipt({ idempotentReplay: true }) }))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('idempotent_replay')
      expect(r.receipt?.commandId).toBe(params.commandId)
    })

    it('returns dependency_not_met on 428', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Blocked', code: 'DEPENDENCY_NOT_MET' } }, 428))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('dependency_not_met')
    })

    it.each([408, 429, 503])('classifies HTTP %s as retryable network error', async (status) => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Temporary failure' } }, status))
      expect((await submitCommand(params, 't1', 'a1')).status).toBe('network_error')
    })

    it('returns device_error on 403 DEVICE_NOT_REGISTERED', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'No device', code: 'DEVICE_NOT_REGISTERED' } }, 403))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('device_error')
    })

    it('returns lease_error on 410 LEASE_EXPIRED', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Expired', code: 'LEASE_EXPIRED' } }, 410))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('lease_error')
    })

    it('returns signature_error on 403 DEVICE_SIGNATURE_INVALID', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Bad sig', code: 'DEVICE_SIGNATURE_INVALID' } }, 403))
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('signature_error')
    })

    it('returns no_trust when trust store not ready', async () => {
      vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: false, deviceId: null, leaseStatus: 'none', lastVerifiedAt: null, setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('no_trust')
      vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid', lastVerifiedAt: Date.now(), setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
    })

    it('returns no_device_key when device key missing', async () => {
      vi.mocked(await import('../../../../src/shared/offline/deviceTrust')).getStoredDevice.mockResolvedValueOnce(null)
      const r = await submitCommand(params, 't1', 'a1')
      expect(r.status).toBe('no_device_key')
    })
  })

  describe('getCommandResult', () => {
    it('GET /commands/:commandId', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { commandId: 'c1', status: 'succeeded' } }))
      const r = await getCommandResult('c1')
      expect(r.receipt!.status).toBe('succeeded')
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/commands/c1')
    })

    it('passes commandType as query param', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { commandId: 'c1' } }))
      await getCommandResult('c1', 'start')
      expect(fetchSpy.mock.calls[0][0]).toContain('?commandType=start')
    })

    it('returns error on 404', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Not found', code: 'COMMAND_NOT_FOUND' } }, 404))
      const r = await getCommandResult('missing')
      expect(r.error).toContain('Not found')
    })
  })
})

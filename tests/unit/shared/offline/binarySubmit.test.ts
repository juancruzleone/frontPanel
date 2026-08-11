/**
 * R8 — Binary evidence: metadata binding + multipart byte upload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: { getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }) },
}))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({
  getStoredLease: vi.fn().mockResolvedValue({
    lease: { tenantId: 't1', userId: 'a1', deviceId: 'dev-1', expiresAt: '2025-12-31' },
    header: { alg: 'ES256', kid: 'k1' }, signature: 'sig', storedAt: Date.now(),
  }),
}))
vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, sha256Hex: vi.fn().mockResolvedValue('a'.repeat(64)) }
})

const { submitBinary, getBinaryResult, hashBlob } = await import('../../../../src/shared/offline/binarySubmit')
const { BINARY_ERROR_CODES } = await import('../../../../src/shared/offline/binaryTypes')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('R8 binarySubmit', () => {
  beforeEach(() => { fetchSpy.mockReset() })

  const mkBlob = (type = 'image/jpeg', size = 100) => new Blob([new Uint8Array(size)], { type })
  const base = { evidenceId: 'ev1', commandId: 'cmd1', orderId: 'ord1', packageId: 'pkg1' }

  it('two-phase: metadata binding then multipart upload', async () => {
    // Phase 1: metadata
    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    // Phase 2: upload
    fetchSpy.mockResolvedValueOnce(json({ success: true }))

    const r = await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')
    expect(r.status).toBe('submitted')
    expect(r.receipt!.evidenceId).toBe('ev1')

    // Verify phase 1: JSON metadata to /binaries
    const [url1, opts1] = fetchSpy.mock.calls[0]
    expect(url1).toBe('/api/offline/binaries')
    expect(opts1.headers['Content-Type']).toBe('application/json')
    const body1 = JSON.parse(opts1.body)
    expect(body1.evidenceId).toBe('ev1')
    expect(body1.contentHash).toMatch(/^[a-f0-9]{64}$/)

    // Verify phase 2: multipart to /uploads/binary
    const [url2, opts2] = fetchSpy.mock.calls[1]
    expect(url2).toBe('/api/uploads/binary')
    expect(opts2.body).toBeInstanceOf(FormData)
  })

  it('returns upload_failed when metadata ok but upload fails', async () => {
    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Storage full' } }, 500))

    const r = await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')
    expect(r.status).toBe('upload_failed')
    expect(r.receipt).toBeDefined() // receipt preserved even though upload failed
    expect(r.error).toContain('Storage full')
  })

  it('returns duplicate on 409 DUPLICATE_EVIDENCE_ID', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Dup', code: 'DUPLICATE_EVIDENCE_ID' } }, 409))
    const r = await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')
    expect(r.status).toBe('duplicate')
    expect(fetchSpy).toHaveBeenCalledTimes(1) // no upload attempted
  })

  it('returns device_error on 403 DEVICE_NOT_REGISTERED', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'No device', code: 'DEVICE_NOT_REGISTERED' } }, 403))
    const r = await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')
    expect(r.status).toBe('device_error')
  })

  it('returns lease_error on 410 LEASE_EXPIRED', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Expired', code: 'LEASE_EXPIRED' } }, 410))
    expect((await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')).status).toBe('lease_error')
  })

  it('returns invalid_type for disallowed content type (no fetch)', async () => {
    const r = await submitBinary({ ...base, blob: mkBlob('application/zip') }, 't1', 'a1')
    expect(r.status).toBe('invalid_type')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns size_exceeded for oversized blob (no fetch)', async () => {
    const r = await submitBinary({ ...base, blob: mkBlob('image/jpeg', 60 * 1024 * 1024) }, 't1', 'a1')
    expect(r.status).toBe('size_exceeded')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns no_trust when trust store not ready', async () => {
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: false, deviceId: null, leaseStatus: 'none', lastVerifiedAt: null, setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
    expect((await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')).status).toBe('no_trust')
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid', lastVerifiedAt: Date.now(), setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
  })

  it('returns network_error on fetch failure', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('offline'))
    expect((await submitBinary({ ...base, blob: mkBlob() }, 't1', 'a1')).status).toBe('network_error')
  })

  it('getBinaryResult GET /binaries/:evidenceId', async () => {
    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1' } }))
    expect((await getBinaryResult('ev1')).receipt!.evidenceId).toBe('ev1')
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/binaries/ev1')
  })

  it('hashBlob returns 64-char hex', async () => {
    expect(await hashBlob(new Blob(['test']))).toMatch(/^[a-f0-9]{64}$/)
  })

  it('error code contract exposes all 13 codes', () => {
    expect(Object.values(BINARY_ERROR_CODES)).toHaveLength(13)
  })
})

/**
 * R10 — Document API client: register, fetch, receipt, checksum.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts),
}))

const { DOCUMENT_ERROR_CODES, DOCUMENT_STATUS } = await import('../../../../src/shared/offline/types')
const { registerDocument, fetchDocumentContent, getDocumentReceipt, sha256Hex } =
  await import('../../../../src/shared/offline/documentService')

const H = 'a'.repeat(64)
const json = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body,
  arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(body)).buffer,
})

describe('R10 documentService', () => {
  beforeEach(() => { fetchSpy.mockReset() })

  describe('registerDocument', () => {
    it('POST /api/offline/documents/register with exact body', async () => {
      const receipt = { documentId: 'd1', version: 1, contentHash: H, contentSize: 100, contentType: 'application/pdf', status: 'available' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt }))
      const r = await registerDocument({ documentId: 'd1', title: 'M', contentType: 'application/pdf', contentSize: 100, contentHash: H, scope: { packageId: 'p' } })
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/documents/register')
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body).scope.packageId).toBe('p')
      expect(r.receipt!.documentId).toBe('d1')
    })
    it('returns INVALID_CONTENT_TYPE on 400', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'bad', code: 'INVALID_CONTENT_TYPE' } }, 400))
      const r = await registerDocument({ documentId: 'd', title: 't', contentType: 'text/html', contentSize: 10, contentHash: H })
      expect(r.error!.code).toBe('INVALID_CONTENT_TYPE')
    })
    it('returns NETWORK_ERROR on fetch failure', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('offline'))
      const r = await registerDocument({ documentId: 'd', title: 't', contentType: 'application/pdf', contentSize: 10, contentHash: H })
      expect(r.error!.code).toBe('NETWORK_ERROR')
    })
  })

  describe('fetchDocumentContent', () => {
    it('fetches metadata + content, verifies checksum', async () => {
      const bytes = new TextEncoder().encode('test')
      const hash = await sha256Hex(bytes)
      const doc = { documentId: 'd2', version: 1, title: 'G', contentType: 'application/pdf', contentSize: 4, contentHash: hash, scope: {}, status: 'available' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer, json: async () => ({}) })
      const r = await fetchDocumentContent({ documentId: 'd2', packageId: 'p', deviceId: 'dev' })
      expect(r.document!.documentId).toBe('d2')
      expect(r.content).toBeDefined()
    })
    it('rejects tampered content (DOCUMENT_TAMPERED)', async () => {
      const doc = { documentId: 'dt', version: 1, title: 'T', contentType: 'application/pdf', contentSize: 5, contentHash: '0'.repeat(64), scope: {}, status: 'available' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('real!').buffer, json: async () => ({}) })
      const r = await fetchDocumentContent({ documentId: 'dt', packageId: 'p', deviceId: 'dev' })
      expect(r.error!.code).toBe('DOCUMENT_TAMPERED')
    })
    it('returns DEVICE_NOT_REGISTERED on 403', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'no device', code: 'DEVICE_NOT_REGISTERED' } }, 403))
      const r = await fetchDocumentContent({ documentId: 'd', packageId: 'p', deviceId: 'x' })
      expect(r.error!.code).toBe('DEVICE_NOT_REGISTERED')
    })
    it('returns LEASE_EXPIRED on 410', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'expired', code: 'LEASE_EXPIRED' } }, 410))
      const r = await fetchDocumentContent({ documentId: 'd', packageId: 'p', deviceId: 'dev' })
      expect(r.error!.code).toBe('LEASE_EXPIRED')
    })
    it('returns DOCUMENT_STALE on 409', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'stale', code: 'DOCUMENT_STALE' } }, 409))
      const r = await fetchDocumentContent({ documentId: 'd', packageId: 'p', deviceId: 'dev' })
      expect(r.error!.code).toBe('DOCUMENT_STALE')
    })
  })

  describe('getDocumentReceipt', () => {
    it('GET /api/offline/documents/:id', async () => {
      const receipt = { documentId: 'd3', version: 2, contentHash: H, contentSize: 500, contentType: 'application/pdf', status: 'available', checksum: 'c' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt }))
      const r = await getDocumentReceipt('d3')
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/documents/d3')
      expect(fetchSpy.mock.calls[0][1].method).toBe('GET')
      expect(r.receipt!.version).toBe(2)
    })
    it('returns DOCUMENT_NOT_FOUND on 404', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'no', code: 'DOCUMENT_NOT_FOUND' } }, 404))
      expect((await getDocumentReceipt('x')).error!.code).toBe('DOCUMENT_NOT_FOUND')
    })
    it('encodes special chars in documentId', async () => {
      fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: {} }))
      await getDocumentReceipt('a/b c')
      expect(fetchSpy.mock.calls[0][0]).toContain(encodeURIComponent('a/b c'))
    })
  })

  describe('sha256Hex', () => {
    it('returns 64-char lowercase hex', async () => {
      expect(await sha256Hex(new TextEncoder().encode('h'))).toMatch(/^[a-f0-9]{64}$/)
    })
    it('is deterministic', async () => {
      expect(await sha256Hex(new TextEncoder().encode('x'))).toBe(await sha256Hex(new TextEncoder().encode('x')))
    })
    it('differs for different input', async () => {
      expect(await sha256Hex(new TextEncoder().encode('a'))).not.toBe(await sha256Hex(new TextEncoder().encode('b')))
    })
  })

  describe('error code contract', () => {
    it('exposes all 14 backend error codes', () => {
      expect(Object.values(DOCUMENT_ERROR_CODES)).toHaveLength(14)
      expect(DOCUMENT_ERROR_CODES.DOCUMENT_NOT_FOUND).toBe('DOCUMENT_NOT_FOUND')
      expect(DOCUMENT_ERROR_CODES.LEASE_EXPIRED).toBe('LEASE_EXPIRED')
    })
    it('exposes all 4 status values', () => {
      expect(DOCUMENT_STATUS.AVAILABLE).toBe('available')
      expect(DOCUMENT_STATUS.REVOKED).toBe('revoked')
    })
  })
})

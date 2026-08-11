/**
 * R10 Unit C — Integration: fetch→verify→store→readiness pipeline.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Fetch mock ──────────────────────────────────────────────────────────
const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts),
}))

// ── IndexedDB mock ──────────────────────────────────────────────────────
interface MockRec { [k: string]: unknown }
const dbStore: Record<string, MockRec> = {}

function createIDBMock() {
  return {
    open: vi.fn().mockImplementation(() => {
      let onsuccess: ((e: { target: { result: unknown } }) => void) | null = null
      let onerror: ((e: { target: { error: unknown } }) => void) | null = null
      const req = {
        set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { onsuccess = fn },
        get onsuccess() { return onsuccess },
        set onerror(fn: ((e: { target: { error: unknown } }) => void) | null) { onerror = fn },
        get onerror() { return onerror },
        result: undefined as unknown,
        error: null,
      }
      // Fire onsuccess on next microtask (after caller sets handlers)
      queueMicrotask(() => {
        const db = {
          objectStoreNames: { contains: () => true },
          transaction: () => ({
            objectStore: () => ({
               put: vi.fn().mockImplementation((val: MockRec, key?: string) => {
                 const id = key ?? (val as { documentId: string }).documentId
                dbStore[id] = val
                let putOk: (() => void) | null = null
                let putErr: ((e: { target: { error: unknown } }) => void) | null = null
                const putReq = {
                  set onsuccess(fn: (() => void) | null) { putOk = fn },
                  get onsuccess() { return putOk },
                  set onerror(fn: ((e: { target: { error: unknown } }) => void) | null) { putErr = fn },
                  get onerror() { return putErr },
                  result: undefined,
                  error: null,
                }
                queueMicrotask(() => putOk?.())
                return putReq
              }),
              get: vi.fn().mockImplementation((k: string) => {
                let getOk: ((e: { target: { result: MockRec | undefined } }) => void) | null = null
                const getReq = {
                  set onsuccess(fn: ((e: { target: { result: MockRec | undefined } }) => void) | null) { getOk = fn },
                  get onsuccess() { return getOk },
                  set onerror(_fn: unknown) {},
                  result: dbStore[k],
                  error: null,
                }
                queueMicrotask(() => getOk?.({ target: { result: dbStore[k] } }))
                return getReq
              }),
              delete: vi.fn().mockImplementation((k: string) => {
                delete dbStore[k]
                let delOk: (() => void) | null = null
                const delReq = {
                  set onsuccess(fn: (() => void) | null) { delOk = fn },
                  get onsuccess() { return delOk },
                  set onerror(_fn: unknown) {},
                  result: undefined,
                  error: null,
                }
                queueMicrotask(() => delOk?.())
                return delReq
              }),
              getAll: vi.fn().mockImplementation(() => {
                let allOk: ((e: { target: { result: MockRec[] } }) => void) | null = null
                const allReq = {
                  set onsuccess(fn: ((e: { target: { result: MockRec[] } }) => void) | null) { allOk = fn },
                  get onsuccess() { return allOk },
                  set onerror(_fn: unknown) {},
                  result: Object.values(dbStore),
                  error: null,
                }
                queueMicrotask(() => allOk?.({ target: { result: Object.values(dbStore) } }))
                return allReq
              }),
            }),
          }),
        }
        req.result = db
        onsuccess?.({ target: { result: db } })
      })
      return req
    }),
  }
}

vi.stubGlobal('indexedDB', createIDBMock())

// ── Import AFTER mocks ──────────────────────────────────────────────────
const { fetchAndStoreDocument, sha256Hex } = await import('../../../../src/shared/offline/documentService')
const { isDocumentReady, getStoredDocument, clearDocumentStore } = await import('../../../../src/shared/offline/documentStorage')

// ── Helpers ─────────────────────────────────────────────────────────────
const json = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => body,
  arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(body)).buffer,
})

describe('R10 Unit C — fetch→verify→store→readiness', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    for (const k of Object.keys(dbStore)) delete dbStore[k]
    // Set up auth-storage for scopeKey resolution
    localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1', deviceId: 'dev-1' } }))
  })

  describe('fetchAndStoreDocument', () => {
    it('fetches, verifies checksum, persists, and document is ready', async () => {
      const bytes = new TextEncoder().encode('manual content')
      const hash = await sha256Hex(bytes)
      const doc = { documentId: 'man-1', version: 1, title: 'Manual', contentType: 'application/pdf', contentSize: bytes.length, contentHash: hash, scope: { packageId: 'pkg-1' }, status: 'available' }

      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer, json: async () => ({}) })

      const result = await fetchAndStoreDocument({ documentId: 'man-1', packageId: 'pkg-1', deviceId: 'dev-1' })

      expect(result.document).toBeDefined()
      expect(result.document!.documentId).toBe('man-1')
      expect(result.error).toBeUndefined()
      expect(await isDocumentReady('man-1')).toBe(true)
      const stored = await getStoredDocument('man-1')
      expect(stored!.blob).toBeInstanceOf(Blob)
      expect(stored!.scopeKey).toContain(':')
    })

    it('does NOT persist on checksum mismatch', async () => {
      const doc = { documentId: 'bad-1', version: 1, title: 'Bad', contentType: 'application/pdf', contentSize: 5, contentHash: '0'.repeat(64), scope: {}, status: 'available' }

      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('real!').buffer, json: async () => ({}) })

      const result = await fetchAndStoreDocument({ documentId: 'bad-1', packageId: 'p', deviceId: 'd' })

      expect(result.error!.code).toBe('DOCUMENT_TAMPERED')
      expect(await isDocumentReady('bad-1')).toBe(false)
    })

    it('does NOT persist on trust gate failure', async () => {
      fetchSpy.mockResolvedValueOnce(json({ error: { message: 'expired', code: 'LEASE_EXPIRED' } }, 410))

      const result = await fetchAndStoreDocument({ documentId: 'exp-1', packageId: 'p', deviceId: 'd' })

      expect(result.error!.code).toBe('LEASE_EXPIRED')
      expect(await isDocumentReady('exp-1')).toBe(false)
    })

    it('populates scopeKey from auth-storage', async () => {
      const bytes = new TextEncoder().encode('x')
      const hash = await sha256Hex(bytes)
      const doc = { documentId: 'sc-1', version: 1, title: 'T', contentType: 'text/plain', contentSize: 1, contentHash: hash, scope: {}, status: 'available' }

      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer, json: async () => ({}) })

      await fetchAndStoreDocument({ documentId: 'sc-1', packageId: 'p', deviceId: 'dev-1' })

      const stored = await getStoredDocument('sc-1')
      expect(stored!.scopeKey).toMatch(/.+:.+:.+/)
    })
  })

  describe('isDocumentReady', () => {
    it('returns true after fetchAndStore', async () => {
      const bytes = new TextEncoder().encode('r')
      const hash = await sha256Hex(bytes)
      const doc = { documentId: 'rdy-1', version: 1, title: 'R', contentType: 'text/plain', contentSize: 1, contentHash: hash, scope: {}, status: 'available' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer, json: async () => ({}) })

      await fetchAndStoreDocument({ documentId: 'rdy-1', packageId: 'p', deviceId: 'd' })
      expect(await isDocumentReady('rdy-1')).toBe(true)
    })

    it('returns false for missing document', async () => {
      expect(await isDocumentReady('nope')).toBe(false)
    })

    it('returns false after purge', async () => {
      const bytes = new TextEncoder().encode('p')
      const hash = await sha256Hex(bytes)
      const doc = { documentId: 'purge-1', version: 1, title: 'P', contentType: 'text/plain', contentSize: 1, contentHash: hash, scope: {}, status: 'available' }
      fetchSpy.mockResolvedValueOnce(json({ success: true, document: doc }))
      fetchSpy.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => bytes.buffer, json: async () => ({}) })

      await fetchAndStoreDocument({ documentId: 'purge-1', packageId: 'p', deviceId: 'd' })
      expect(await isDocumentReady('purge-1')).toBe(true)

      await clearDocumentStore()
      expect(await isDocumentReady('purge-1')).toBe(false)
    })
  })
})

/**
 * R10 Unit B — IndexedDB document storage, quota, identity purge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── IndexedDB mock ──────────────────────────────────────────────────────

interface MockRec { [k: string]: unknown }

function createIDBMock() {
  const stores: Record<string, Record<string, MockRec>> = { offlineDocumentsScoped: {} }
  const mkReq = <T>(result?: T, error?: Error) => {
    const r = { onsuccess: null as ((e: { target: { result: T } }) => void) | null, onerror: null as ((e: { target: { error: Error } }) => void) | null, result: undefined as unknown as T, error: error ?? null }
    setTimeout(() => { if (error && r.onerror) r.onerror({ target: r }); else if (r.onsuccess) { r.result = result as T; r.onsuccess({ target: r }) } }, 0)
    return r
  }
  return {
    _stores: stores,
    _clear() { stores.offlineDocumentsScoped = {} },
    open: vi.fn().mockImplementation(() => mkReq({
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
      transaction: vi.fn().mockImplementation((name: string) => {
         const s = stores[name] ?? (stores[name] = {})
        return {
          objectStore: vi.fn().mockReturnValue({
             put: vi.fn().mockImplementation((val: MockRec, key?: string) => { const k = key ?? (val as { documentId?: string }).documentId ?? 'x'; s[k] = val; return mkReq(k) }),
            get: vi.fn().mockImplementation((k: string) => mkReq(s[k])),
            delete: vi.fn().mockImplementation((k: string) => { delete s[k]; return mkReq(undefined) }),
            getAll: vi.fn().mockImplementation(() => mkReq(Object.values(s))),
          }),
        }
      }),
    })),
  }
}

const idb = createIDBMock()
vi.stubGlobal('indexedDB', idb)

const { saveDocument, getStoredDocument, listStoredDocuments, removeStoredDocument, clearDocumentStore, getDocumentQuotaUsage } =
  await import('../../../../src/shared/offline/documentStorage')

const SCOPE = 't1:u1:dev1'
const OTHER_SCOPE = 'other:user:dev'
const mkDoc = (id: string, size = 100, scopeKey = SCOPE) => ({
  documentId: id, version: 1, title: `Doc ${id}`, contentType: 'application/pdf',
  contentSize: size, contentHash: 'a'.repeat(64), scope: {}, status: 'available' as const,
  blob: new Blob(['x']), storedAt: Date.now(), scopeKey,
})

describe('R10 documentStorage', () => {
  beforeEach(() => {
    idb._clear()
    localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1', deviceId: 'dev1' } }))
  })

  describe('saveDocument + getStoredDocument', () => {
    it('saves and retrieves a document by documentId', async () => {
      const doc = mkDoc('d1')
      await saveDocument(doc)
      const got = await getStoredDocument('d1')
      expect(got).toBeDefined()
      expect(got!.documentId).toBe('d1')
      expect(got!.blob).toBeInstanceOf(Blob)
    })
    it('returns null for missing documentId', async () => {
      expect(await getStoredDocument('missing')).toBeNull()
    })
    it('overwrites on duplicate documentId (upsert)', async () => {
      await saveDocument(mkDoc('d2', 100))
      await saveDocument(mkDoc('d2', 200))
      const got = await getStoredDocument('d2')
      expect(got!.contentSize).toBe(200)
    })
    it('isolates the same documentId across identity scopes', async () => {
      await saveDocument(mkDoc('shared', 100))
      localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't2', userId: 'u2', deviceId: 'dev2' } }))
      await saveDocument(mkDoc('shared', 200, 't2:u2:dev2'))
      expect(await getStoredDocument('shared')).toMatchObject({ contentSize: 200 })
      localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1', deviceId: 'dev1' } }))
      expect(await getStoredDocument('shared')).toMatchObject({ contentSize: 100 })
    })
  })

  describe('listStoredDocuments', () => {
    it('returns all documents for the active identity scope', async () => {
      await saveDocument(mkDoc('a', 100, SCOPE))
      await saveDocument(mkDoc('b', 200, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:c`] = mkDoc('c', 50, OTHER_SCOPE)
      const list = await listStoredDocuments()
      expect(list).toHaveLength(2)
      expect(list.map(d => d.documentId).sort()).toEqual(['a', 'b'])
    })
    it('returns empty array when no documents match', async () => {
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:x`] = mkDoc('x', 100, OTHER_SCOPE)
      expect(await listStoredDocuments()).toEqual([])
    })
    it('ignores a caller-supplied identity scope', async () => {
      await saveDocument(mkDoc('active', 100, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:private`] = mkDoc('private', 200, OTHER_SCOPE)

      const listWithForgedScope = listStoredDocuments as unknown as (scopeKey: string) => ReturnType<typeof listStoredDocuments>
      const list = await listWithForgedScope(OTHER_SCOPE)

      expect(list.map(d => d.documentId)).toEqual(['active'])
    })
  })

  describe('removeStoredDocument', () => {
    it('deletes a document by documentId', async () => {
      await saveDocument(mkDoc('rm1'))
      await removeStoredDocument('rm1')
      expect(await getStoredDocument('rm1')).toBeNull()
    })
    it('is a no-op for missing documentId', async () => {
      await removeStoredDocument('nope')
      // no error
    })
  })

  describe('clearDocumentStore', () => {
    it('clears all documents for the active identity scope, leaves others', async () => {
      await saveDocument(mkDoc('x1', 100, SCOPE))
      await saveDocument(mkDoc('x2', 100, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:y1`] = mkDoc('y1', 100, OTHER_SCOPE)
      await clearDocumentStore()
      expect(await listStoredDocuments()).toEqual([])
      expect(idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:y1`]).toBeDefined()
    })
    it('cannot clear documents under a caller-supplied identity scope', async () => {
      await saveDocument(mkDoc('active', 100, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:private`] = mkDoc('private', 100, OTHER_SCOPE)

      const clearWithForgedScope = clearDocumentStore as unknown as (scopeKey: string) => ReturnType<typeof clearDocumentStore>
      await clearWithForgedScope(OTHER_SCOPE)

      expect(idb._stores.offlineDocumentsScoped[`${SCOPE}:active`]).toBeUndefined()
      expect(idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:private`]).toBeDefined()
    })
  })

  describe('getDocumentQuotaUsage', () => {
    it('computes totalSize and count for the active identity scope', async () => {
      await saveDocument(mkDoc('q1', 1000, SCOPE))
      await saveDocument(mkDoc('q2', 2500, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:q3`] = mkDoc('q3', 500, OTHER_SCOPE)
      const usage = await getDocumentQuotaUsage()
      expect(usage.totalSize).toBe(3500)
      expect(usage.count).toBe(2)
    })
    it('returns zeros for empty scope', async () => {
      const usage = await getDocumentQuotaUsage()
      expect(usage.totalSize).toBe(0)
      expect(usage.count).toBe(0)
    })
    it('does not count documents under a caller-supplied identity scope', async () => {
      await saveDocument(mkDoc('active', 1000, SCOPE))
      idb._stores.offlineDocumentsScoped[`${OTHER_SCOPE}:private`] = mkDoc('private', 500, OTHER_SCOPE)

      const quotaWithForgedScope = getDocumentQuotaUsage as unknown as (scopeKey: string) => ReturnType<typeof getDocumentQuotaUsage>
      const usage = await quotaWithForgedScope(OTHER_SCOPE)

      expect(usage).toEqual({ totalSize: 1000, count: 1 })
    })
  })
})

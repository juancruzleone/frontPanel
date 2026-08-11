/**
 * R10 Unit B — IndexedDB document storage with owner binding, quota tracking, identity purge.
 * Forward-compatible with R5 encrypted storage when feature branches merge.
 */
import type { StoredDocumentRecord } from './types'

const DB_NAME = 'GMAO_Offline_DB'
const STORE = 'offlineDocumentsScoped'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'))
    const req = indexedDB.open(DB_NAME)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
  })
}

async function store(mode: IDBTransactionMode = 'readonly') {
  const db = await openDB()
  return db.transaction(STORE, mode).objectStore(STORE)
}

/** Persist a document record. Upserts by scoped document identity. */
export async function saveDocument(doc: StoredDocumentRecord): Promise<void> {
  const scopeKey = currentScopeKey()
  if (doc.scopeKey !== scopeKey) throw new Error('Document scope mismatch')
  const s = await store('readwrite')
  return new Promise((resolve, reject) => {
    const storageKey = buildStorageKey(scopeKey, doc.documentId)
    const req = s.put({ ...doc, storageKey }, storageKey)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Get a stored document by documentId in the active identity scope. */
export async function getStoredDocument(documentId: string): Promise<StoredDocumentRecord | null> {
  const s = await store('readonly')
  return new Promise((resolve, reject) => {
    const req = s.get(buildStorageKey(currentScopeKey(), documentId))
    req.onsuccess = () => resolve((req.result as StoredDocumentRecord) ?? null)
    req.onerror = () => reject(req.error)
  })
}

/** List all stored documents in the active identity scope. */
export async function listStoredDocuments(): Promise<StoredDocumentRecord[]> {
  const scopeKey = currentScopeKey()
  const s = await store('readonly')
  return new Promise((resolve, reject) => {
    const req = s.getAll()
    req.onsuccess = () => resolve((req.result as StoredDocumentRecord[]).filter(d => d.scopeKey === scopeKey))
    req.onerror = () => reject(req.error)
  })
}

/** Remove a stored document by documentId in the active identity scope. */
export async function removeStoredDocument(documentId: string): Promise<void> {
  const s = await store('readwrite')
  return new Promise((resolve, reject) => {
    const req = s.delete(buildStorageKey(currentScopeKey(), documentId))
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Clear all stored documents in the active identity scope. Leaves other scopes intact. */
export async function clearDocumentStore(): Promise<void> {
  const docs = await listStoredDocuments()
  const s = await store('readwrite')
  await Promise.all(docs.map(d => new Promise<void>((resolve, reject) => {
    const req = s.delete(buildStorageKey(d.scopeKey, d.documentId))
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })))
}

/** Check if a document is stored locally and ready for offline use. */
export async function isDocumentReady(documentId: string): Promise<boolean> {
  const doc = await getStoredDocument(documentId)
  return doc !== null
}

/** Compute quota usage (totalSize + count) for the active identity scope. */
export async function getDocumentQuotaUsage(): Promise<{ totalSize: number; count: number }> {
  const docs = await listStoredDocuments()
  return { totalSize: docs.reduce((sum, d) => sum + (d.contentSize || 0), 0), count: docs.length }
}

function buildStorageKey(scopeKey: string, documentId: string): string {
  return `${scopeKey}:${documentId}`
}

function currentScopeKey(): string {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return 'unscoped'
    const { state } = JSON.parse(raw)
    if (!state?.tenantId || !state?.userId) return 'unscoped'
    return `${state.tenantId}:${state.userId}:${state.deviceId ?? 'unknown'}`
  } catch { return 'unscoped' }
}

/**
 * R10 — Frontend offline document API client.
 * Typed client for backPanel document endpoints with SHA-256 checksum verification.
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import type { DocumentReceipt, DocumentManifestEntry, DocumentContentMeta, DocumentScope, DocumentServiceError, StoredDocumentRecord } from './types'
import { saveDocument } from './documentStorage'

const API = '/api/offline'

export interface RegisterResult { receipt?: DocumentReceipt; error?: DocumentServiceError }
export interface FetchContentResult { document?: DocumentContentMeta; content?: ArrayBuffer; error?: DocumentServiceError }
export interface ReceiptResult { receipt?: DocumentManifestEntry; error?: DocumentServiceError }

export interface RegisterDocumentParams {
  documentId: string; title: string; contentType: string; contentSize: number
  contentHash: string; scope?: DocumentScope; version?: number; storageRef?: { bucket: string; key: string } | null
}

/** POST /api/offline/documents/register — register document for offline. Idempotent. */
export async function registerDocument(p: RegisterDocumentParams): Promise<RegisterResult> {
  try {
    const res = await fetchWithAuthRetry(`${API}/documents/register`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: p.documentId, title: p.title, contentType: p.contentType,
        contentSize: p.contentSize, contentHash: p.contentHash,
        scope: p.scope ?? {}, version: p.version ?? 1, storageRef: p.storageRef ?? null,
      }),
    })
    const body = await parse(res)
    if (!res.ok) return { error: err(body, res.status) }
    return { receipt: body.receipt as DocumentReceipt | undefined }
  } catch (e) { return { error: netErr(e) } }
}

export interface FetchContentParams {
  documentId: string; packageId: string; deviceId: string
  lease?: object; leaseHeader?: object; leaseSignature?: string
}

/** POST /api/offline/documents — fetch content through R1 trust gate, verify SHA-256. */
export async function fetchDocumentContent(p: FetchContentParams): Promise<FetchContentResult> {
  try {
    const reqBody = {
      documentId: p.documentId, packageId: p.packageId, deviceId: p.deviceId,
      lease: p.lease, leaseHeader: p.leaseHeader, leaseSignature: p.leaseSignature,
    }
    const metaRes = await fetchWithAuthRetry(`${API}/documents`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    })
    const meta = await parse(metaRes)
    if (!metaRes.ok) return { error: err(meta, metaRes.status) }
    const doc = meta.document as DocumentContentMeta | undefined
    if (!doc) return { error: { message: 'No document in response', code: 'DOCUMENT_NOT_FOUND' } }

    const contentRes = await fetchWithAuthRetry(`${API}/documents`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/octet-stream' },
      body: JSON.stringify(reqBody),
    })
    if (!contentRes.ok) return { error: err(await parse(contentRes), contentRes.status) }

    const content = await contentRes.arrayBuffer()
    const hash = await sha256Hex(new Uint8Array(content))
    if (hash !== doc.contentHash) return { error: { message: 'Checksum mismatch', code: 'DOCUMENT_TAMPERED' } }
    return { document: doc, content }
  } catch (e) { return { error: netErr(e) } }
}

export interface FetchAndStoreResult { document?: StoredDocumentRecord; error?: DocumentServiceError }

/** Fetch→verify→store pipeline. Persists only after checksum passes. */
export async function fetchAndStoreDocument(p: FetchContentParams): Promise<FetchAndStoreResult> {
  const result = await fetchDocumentContent(p)
  if (result.error || !result.document || !result.content) return { error: result.error }

  const scopeKey = getScopeKey()
  const record: StoredDocumentRecord = {
    documentId: result.document.documentId,
    version: result.document.version,
    title: result.document.title,
    contentType: result.document.contentType,
    contentSize: result.document.contentSize,
    contentHash: result.document.contentHash,
    scope: result.document.scope,
    status: result.document.status as StoredDocumentRecord['status'],
    blob: new Blob([result.content], { type: result.document.contentType }),
    storedAt: Date.now(),
    scopeKey,
  }

  try {
    await saveDocument(record)
    return { document: record }
  } catch (e) {
    return { error: { message: e instanceof Error ? e.message : 'Storage failed', code: 'STORAGE_ERROR' } }
  }
}

/** GET /api/offline/documents/:documentId — durable receipt lookup. */
export async function getDocumentReceipt(documentId: string): Promise<ReceiptResult> {
  try {
    const res = await fetchWithAuthRetry(`${API}/documents/${encodeURIComponent(documentId)}`, {
      method: 'GET', credentials: 'include',
    })
    const body = await parse(res)
    if (!res.ok) return { error: err(body, res.status) }
    return { receipt: body.receipt as DocumentManifestEntry | undefined }
  } catch (e) { return { error: netErr(e) } }
}

/** SHA-256 hex of content bytes. Caller compares against expected hash. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function parse(r: Response): Promise<Record<string, unknown>> {
  try { return (await r.json()) as Record<string, unknown> } catch { return {} }
}
function err(b: Record<string, unknown>, s: number): DocumentServiceError {
  const e = b.error as { message?: string; code?: string } | undefined
  return { message: e?.message ?? `HTTP ${s}`, code: e?.code ?? 'UNKNOWN_ERROR' }
}
function netErr(e: unknown): DocumentServiceError {
  return { message: e instanceof Error ? e.message : 'Network error', code: 'NETWORK_ERROR' }
}
function getScopeKey(): string {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return 'unscoped'
    const { state } = JSON.parse(raw)
    if (!state?.tenantId || !state?.userId) return 'unscoped'
    return `${state.tenantId}:${state.userId}:${state.deviceId ?? 'unknown'}`
  } catch { return 'unscoped' }
}

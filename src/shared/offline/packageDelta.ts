/**
 * R4/R5 — Delta/tombstone application: incremental sync after bootstrap.
 * Fetches deltas, applies upserts/deletes to sealed resources, advances cursor.
 * Failed delta never partially advances state. CURSOR_EXPIRED triggers re-bootstrap.
 */
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getDelta } from './packageService'
import { sealJson, type EncryptedRecordEnvelope } from './envelope'
import { getPersistedPackageKey, type ResourceKind } from './packageStorage'
import type { OfflineDeltaEntry } from './packageTypes'
import { PACKAGE_ERROR_CODES } from './packageTypes'

const DB_NAME = 'GMAO_Offline_DB'
const RES_STORE = 'offlinePackageResources'
const META_STORE = 'offlinePackageMeta'

// Backend collection name → frontend resource kind
const COLLECTION_TO_KIND: Record<string, ResourceKind> = {
  ordenes_trabajo: 'workOrders',
  instalaciones: 'installations',
  activos: 'assets',
  formularios: 'forms',
  inventoryRefs: 'inventoryRefs',
}

export type DeltaApplyStatus = 'applied' | 'empty' | 'cursor_expired' | 're_bootstrap'
  | 'no_trust' | 'fetch_failed' | 'apply_failed' | 'unknown_collection' | 'unknown_operation'

export interface DeltaApplyResult {
  status: DeltaApplyStatus
  applied?: number
  nextCursor?: number
  hasMore?: boolean
  error?: string
}

interface SealedResource {
  id: string
  envelope: EncryptedRecordEnvelope
  kind: ResourceKind
  packageId: string
  scopeKey: string
  entityId?: string
}

/**
 * Fetch and apply pending deltas for a package.
 * Returns applied count + next cursor. hasMore=true means call again.
 * On CURSOR_EXPIRED, caller should invoke downloadPackage() for full re-bootstrap.
 */
export async function applyPendingDeltas(packageId: string): Promise<DeltaApplyResult> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { status: 'no_trust', error: 'Device not ready' }
  const deviceId = trust.deviceId

  // Read current cursor
  const cursor = await getCursor(packageId)

  // Fetch deltas
  const result = await getDelta(packageId, deviceId, cursor)
  if (result.error) {
    if (result.error.code === PACKAGE_ERROR_CODES.CURSOR_EXPIRED) return { status: 'cursor_expired', error: result.error.message }
    return { status: 'fetch_failed', error: `${result.error.code}: ${result.error.message}` }
  }

  const delta = result.delta!
  if (delta.deltas.length === 0) return { status: 'empty', nextCursor: delta.nextCursor, hasMore: false }

  // Apply all deltas atomically — on any failure, cursor is NOT advanced
  try {
    const scopeKey = buildScopeKey(trust, packageId)
    const key = await getPersistedPackageKey(scopeKey)
    if (!key) return { status: 'apply_failed', error: 'No persisted package storage key' }
    const db = await openDB()
    const tx = db.transaction([RES_STORE, META_STORE], 'readwrite')
    const resStore = tx.objectStore(RES_STORE)
    const metaStore = tx.objectStore(META_STORE)

    // Pre-flight: validate ALL entries before ANY writes — fail closed
    for (const entry of delta.deltas) {
      const kind = COLLECTION_TO_KIND[entry.collection]
      if (!kind) return { status: 'unknown_collection', error: `Unknown collection: ${entry.collection}` }
      if (entry.operation !== 'upsert' && entry.operation !== 'delete') {
        return { status: 'unknown_operation', error: `Unknown operation: ${entry.operation}` }
      }
    }

    // Get all current resources for this scope
    const existing = await getAll(resStore, scopeKey)
    const byKindAndEntity = new Map<string, SealedResource>()
    for (const r of existing) {
      if (r.entityId) byKindAndEntity.set(`${r.kind}:${r.entityId}`, r)
    }

    // Apply each delta entry (all validated — safe to write)
    for (const entry of delta.deltas) {
      const kind = COLLECTION_TO_KIND[entry.collection]! // validated above

      if (entry.operation === 'upsert' && entry.data) {
        const entityId = entry.entityId
        const envelope = await sealJson({ key, kid: 'delta', scopeKey, store: kind, value: entry.data })
        const existingKey = `${kind}:${entityId}`
        const existingRec = byKindAndEntity.get(existingKey)
        const id = existingRec?.id ?? `${scopeKey}:${kind}:delta:${entityId}`
        resStore.put({ id, envelope, kind, packageId, scopeKey, entityId })
        byKindAndEntity.set(existingKey, { id, envelope, kind, packageId, scopeKey, entityId })
      } else if (entry.operation === 'delete') {
        const existingKey = `${kind}:${entry.entityId}`
        const rec = byKindAndEntity.get(existingKey)
        if (rec) {
          resStore.delete(rec.id)
          byKindAndEntity.delete(existingKey)
        }
      }
    }

    // Advance cursor atomically with resource updates
    const cursorKey = `${packageId}:cursor`
    metaStore.put({ cursor: delta.nextCursor, updatedAt: Date.now() }, cursorKey)

    await txDone(tx)

    return { status: 'applied', applied: delta.deltas.length, nextCursor: delta.nextCursor, hasMore: delta.hasMore }
  } catch (e) {
    return { status: 'apply_failed', error: e instanceof Error ? e.message : 'Apply failed' }
  }
}

// ── Cursor persistence ──────────────────────────────────────────────────

export async function getPackageCursor(packageId: string): Promise<number> {
  return getCursor(packageId)
}

async function getCursor(packageId: string): Promise<number> {
  try {
    const db = await openDB()
    const tx = db.transaction(META_STORE, 'readonly')
    const rec = await getOne<{ cursor: number }>(tx.objectStore(META_STORE), `${packageId}:cursor`)
    return rec?.cursor ?? 0
  } catch { return 0 }
}

function buildScopeKey(trust: { deviceId: string | null }, packageId: string): string {
  const raw = localStorage.getItem('auth-storage')
  if (!raw) return `unknown:unknown:${trust.deviceId}:${packageId}`
  try {
    const { state } = JSON.parse(raw)
    return `${state.tenantId}:${state.userId}:${trust.deviceId}:${packageId}`
  } catch { return `unknown:unknown:${trust.deviceId}:${packageId}` }
}

// ── IDB helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB'))
    const r = indexedDB.open(DB_NAME)
    r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result)
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(RES_STORE)) d.createObjectStore(RES_STORE, { keyPath: 'id' }); if (!d.objectStoreNames.contains(META_STORE)) d.createObjectStore(META_STORE) }
  })
}

function getAll(s: IDBObjectStore, scopeKey: string): Promise<SealedResource[]> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve((r.result as SealedResource[]).filter(x => x.scopeKey === scopeKey)); r.onerror = () => reject(r.error) })
}

function getOne<T>(s: IDBObjectStore, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => { const r = s.get(key); r.onsuccess = () => resolve((r.result as T) ?? null); r.onerror = () => reject(r.error) })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
}

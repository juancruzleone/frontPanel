/** U6 — Frontend offline package service. Consumes U5 bootstrap/delta, persists scoped packages, quota, eviction. */
import { type OfflineIdentityScope, buildScopeKey, getOrCreateDeviceId } from './types'
import { openDB } from './storage'

const PACKAGES_STORE = 'offlinePackages'
const PROGRESS_STORE = 'downloadProgress'
export const FORM_NOT_DELIVERED = 'FORM_NOT_DELIVERED'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
const API_BASE = '/api/offline'

export interface PackageManifest {
  packageId: string; schemaVersion: number; binding: { tenantId: string; userId: string; deviceId: string }
  packageVersion: number; cursor: string; serverTime: string; expiresAt: string; revocationEpoch: number
  limits: { maxStorageBytes: number }
  completeness: {
    orders: Array<{ orderId: string; status: 'ready' | 'incomplete' | 'error'; missingResources: string[] }>
    forms: Array<{ formId: string; orderId: string; status: 'delivered' | 'not_delivered' | 'version_mismatch'; formVersion?: number }>
    overall: 'complete' | 'incomplete' | 'partial'
  }
  resources: Array<{ type: string; id: string; version: number; checksum: string; formVersion?: number; required: boolean }>
}

export interface DownloadProgress {
  packageId: string; totalResources: number; completedResources: number; failedResources: number
  status: 'idle' | 'downloading' | 'paused' | 'completed' | 'error' | 'quota_exceeded'; lastError?: string; startedAt: number; updatedAt: number
}

export interface StoredPackage {
  packageId: string; manifest: PackageManifest; cursor: string; version: number
  downloadedAt: number; lastSyncedAt: number; freshness: 'fresh' | 'stale' | 'expired'; ownerScope: OfflineIdentityScope
}

function getCurrentScope(): OfflineIdentityScope | null {
  try {
    const authState = localStorage.getItem('auth-storage')
    if (!authState) return null
    const { state } = JSON.parse(authState)
    if (!state?.userId || !state?.tenantId) return null
    return { tenantId: state.tenantId, userId: state.userId, deviceId: getOrCreateDeviceId() }
  } catch { return null }
}

async function apiFetch(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

// ── IndexedDB operations ─────────────────────────────────────────────────

function idbOp<T>(storeName: string, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const store = db.transaction(storeName, mode).objectStore(storeName)
    const req = op(store); req.onerror = () => reject(req.error); req.onsuccess = () => resolve((req.result ?? null) as T)
  }))
}

const putPkg = (pkg: StoredPackage) => idbOp<void>(PACKAGES_STORE, 'readwrite', s => s.put(pkg, pkg.packageId))
const getPkg = (id: string) => idbOp<StoredPackage | undefined>(PACKAGES_STORE, 'readonly', s => s.get(id))
const delPkg = (id: string) => idbOp<void>(PACKAGES_STORE, 'readwrite', s => s.delete(id))
const allPkgs = () => idbOp<StoredPackage[]>(PACKAGES_STORE, 'readonly', s => s.getAll())
const putProg = (p: DownloadProgress) => idbOp<void>(PROGRESS_STORE, 'readwrite', s => s.put(p, p.packageId))
const getProg = (id: string) => idbOp<DownloadProgress | undefined>(PROGRESS_STORE, 'readonly', s => s.get(id))
const delProg = (id: string) => idbOp<void>(PROGRESS_STORE, 'readwrite', s => s.delete(id))

function computeFreshness(lastSyncedAt: number, expiresAt: string): 'fresh' | 'stale' | 'expired' {
  if (new Date(expiresAt) < new Date()) return 'expired'
  return Date.now() - lastSyncedAt > STALE_THRESHOLD_MS ? 'stale' : 'fresh'
}

// ── Public API ───────────────────────────────────────────────────────────

export async function preparePackage(orderId: string): Promise<{ manifest: PackageManifest }> {
  const scope = getCurrentScope()
  if (!scope) throw new Error('Not authenticated')
  const response = await apiFetch('/packages/prepare', { orderId, deviceId: getOrCreateDeviceId() })
  if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error((e as any).error?.message ?? 'Prepare failed') }
  const { manifest }: { manifest: PackageManifest } = await response.json()
  const now = Date.now()
  await putPkg({ packageId: manifest.packageId, manifest, cursor: manifest.cursor, version: manifest.packageVersion, downloadedAt: now, lastSyncedAt: now, freshness: computeFreshness(now, manifest.expiresAt), ownerScope: scope })
  await putProg({ packageId: manifest.packageId, totalResources: manifest.resources.length, completedResources: manifest.resources.length, failedResources: 0, status: 'completed', startedAt: now, updatedAt: now })
  return { manifest }
}

export async function resumeDownload(packageId: string): Promise<void> {
  const scope = getCurrentScope()
  if (!scope) throw new Error('Not authenticated')
  const pkg = await getPkg(packageId)
  if (!pkg) throw new Error('Package not found')
  const now = Date.now()
  const prog: DownloadProgress = { packageId, totalResources: pkg.manifest.resources.length, completedResources: 0, failedResources: 0, status: 'downloading', startedAt: now, updatedAt: now }
  await putProg(prog)
  try {
    const response = await apiFetch('/packages/delta', { clientCursor: pkg.cursor, limit: 100 })
    if (response.status === 410) { await delPkg(packageId); await delProg(packageId); await preparePackage(''); return }
    if (!response.ok) throw new Error('Delta fetch failed')
    const data = await response.json()
    await putPkg({ ...pkg, cursor: data.nextCursor ?? pkg.cursor, lastSyncedAt: Date.now(), freshness: computeFreshness(Date.now(), pkg.manifest.expiresAt) })
    await putProg({ ...prog, completedResources: prog.totalResources, status: 'completed', updatedAt: Date.now() })
  } catch (error) {
    await putProg({ ...prog, status: 'error', lastError: error instanceof Error ? error.message : 'Unknown', updatedAt: Date.now() })
    throw error
  }
}

export async function getDownloadProgress(packageId: string): Promise<DownloadProgress | null> { return getProg(packageId) }

export async function isPackageReady(packageId: string): Promise<boolean> {
  const pkg = await getPkg(packageId)
  if (!pkg) return false
  if (pkg.manifest.completeness.overall !== 'complete') return false
  return !pkg.manifest.completeness.forms.some(f => f.status === 'not_delivered')
}

export async function getStoredPackage(packageId: string): Promise<StoredPackage | null> { return getPkg(packageId) }

export async function getScopedPackages(): Promise<StoredPackage[]> {
  const scope = getCurrentScope()
  if (!scope) return []
  const all = await allPkgs(); const sk = buildScopeKey(scope)
  return all.filter(p => p.ownerScope && buildScopeKey(p.ownerScope) === sk)
}

export async function checkQuota(estimatedBytes: number): Promise<{ sufficient: boolean; available: number; required: number }> {
  if (!navigator.storage?.estimate) return { sufficient: true, available: Infinity, required: estimatedBytes }
  const { quota = 0, usage = 0 } = await navigator.storage.estimate()
  const available = quota - usage
  return { sufficient: available >= estimatedBytes, available, required: estimatedBytes }
}

export async function evictOldest(): Promise<void> {
  const pkgs = await getScopedPackages()
  if (pkgs.length === 0) return
  const oldest = pkgs.reduce((a, b) => a.downloadedAt < b.downloadedAt ? a : b)
  await delPkg(oldest.packageId); await delProg(oldest.packageId)
}

export async function purgePackagesForScope(scope: OfflineIdentityScope): Promise<void> {
  const sk = buildScopeKey(scope); const all = await allPkgs()
  for (const p of all.filter(p => p.ownerScope && buildScopeKey(p.ownerScope) === sk)) {
    await delPkg(p.packageId); await delProg(p.packageId)
  }
}

/**
 * R4 — Offline package service (U6 contract hardening): authenticated
 * CSRF-correct requests with exact R3 shapes, ES256/kid manifest verification
 * against the R2 key set, complete bootstrap resources persisted verbatim
 * scoped to tenant+user+device, atomic readiness, FORM_NOT_DELIVERED blocking,
 * 410 re-bootstrap, and the signed 7-day lease/device-binding gate.
 */
import {
  type OfflineIdentityScope, buildScopeKey, type OfflineBootstrap, type OfflineManifest, type OfflineManifestClaim,
  type OfflineDeltaResponse, type PackageResourceKind, PACKAGE_LEASE_MAX_MS, PACKAGE_SCHEMA_VERSION,
} from './types'
import { importVerificationKey, verifyCanonicalSignature, sha256HexCanonical, type VerificationKey } from './crypto'
import { getCachedVerificationKeys, getStoredDevice } from './deviceTrust'
import {
  deletePackageRecord, deleteProgressRecord, deleteResources,
  getProgressRecord, getPackageRecord, getResourceRecordsForScope, getAllPackageRecords,
  persistPackageBundle, putPackageRecord, putProgressRecord,
  resourceRecordId, type DownloadProgressRecord, type StoredPackageRecord, type StoredResourceRecord,
} from './storage'
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'

export const FORM_NOT_DELIVERED = 'FORM_NOT_DELIVERED'
const API_BASE = '/api/offline'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
const DELTA_LIMIT = 100
const CHECKSUMMED_KINDS: PackageResourceKind[] = ['workOrders', 'installations', 'forms', 'inventoryRefs']
const RESOURCE_KINDS: PackageResourceKind[] = ['workOrders', 'installations', 'assets', 'forms', 'inventoryRefs']

export type ManifestVerificationStatus =
  | 'valid' | 'malformed' | 'invalid_schema_version' | 'no_verification_keys' | 'unknown_kid'
  | 'invalid_signature' | 'binding_mismatch' | 'not_yet_valid' | 'expired' | 'lease_too_long' | 'form_not_delivered'

export class PackageError extends Error {
  constructor(readonly code: string, message?: string) { super(message ?? code) }
}

// ── Identity scope: auth storage + R1-registered device (never the client UUID) ──
async function getPackageScope(): Promise<{ ok: boolean; scope?: OfflineIdentityScope; code?: 'no-auth' | 'no-device' }> {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return { ok: false, code: 'no-auth' }
    const { state } = JSON.parse(raw)
    if (!state?.tenantId || !state?.userId) return { ok: false, code: 'no-auth' }
    const device = await getStoredDevice(`${state.tenantId}:${state.userId}`)
    if (!device?.deviceId) return { ok: false, code: 'no-device' }
    return { ok: true, scope: { tenantId: state.tenantId, userId: state.userId, deviceId: device.deviceId } }
  } catch { return { ok: false, code: 'no-auth' } }
}

// ── Authenticated CSRF-correct requests (fetchWithAuthRetry, never raw fetch) ──
async function postPackage<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithAuthRetry(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const errorBody = await response.json().catch(() => ({})) as { error?: { code?: string } }
  if (response.status === 410) throw new PackageError(errorBody?.error?.code ?? 'CURSOR_EXPIRED')
  if (!response.ok) throw new PackageError(errorBody?.error?.code ?? `HTTP_${response.status}`)
  return response.json() as Promise<T>
}

// ── Canonical manifest verification (ES256/kid, R2 key set) ──
export async function verifyManifest(
  manifest: unknown, scope: OfflineIdentityScope, keySet: VerificationKey[], nowMs: number
): Promise<{ ok: boolean; code?: Exclude<ManifestVerificationStatus, 'valid'> }> {
  if (!manifest || typeof manifest !== 'object') return { ok: false, code: 'malformed' }
  const m = manifest as OfflineManifest
  if (m.schemaVersion !== PACKAGE_SCHEMA_VERSION) return { ok: false, code: 'invalid_schema_version' }
  const sig = m.signature
  if (!sig || sig.alg !== 'ES256' || typeof sig.kid !== 'string' || typeof sig.value !== 'string') return { ok: false, code: 'malformed' }
  if (!keySet.length) return { ok: false, code: 'no_verification_keys' }
  const key = keySet.find(k => k.kid === sig.kid)
  if (!key) return { ok: false, code: 'unknown_kid' }
  const publicKey = await importVerificationKey(key).catch(() => null)
  if (!publicKey) return { ok: false, code: 'unknown_kid' }
  const { signature: _signature, ...claims } = m
  if (!(await verifyCanonicalSignature(claims, sig.value, publicKey))) return { ok: false, code: 'invalid_signature' }
  const b = m.binding
  if (!b || b.tenantId !== scope.tenantId || b.userId !== scope.userId || b.deviceId !== scope.deviceId
    || m.tenantId !== scope.tenantId || m.userId !== scope.userId || m.deviceId !== scope.deviceId) return { ok: false, code: 'binding_mismatch' }
  const serverMs = Date.parse(m.serverTime)
  const expiresMs = Date.parse(m.expiresAt)
  if (Number.isNaN(serverMs) || Number.isNaN(expiresMs) || serverMs > nowMs) return { ok: false, code: 'not_yet_valid' }
  if (expiresMs - serverMs > PACKAGE_LEASE_MAX_MS) return { ok: false, code: 'lease_too_long' }
  if (expiresMs <= nowMs) return { ok: false, code: 'expired' }
  if (Object.values(m.completeness ?? {}).some(c => c?.available === false)) return { ok: false, code: 'form_not_delivered' }
  return { ok: true }
}

// ── Resource checksums: canonical subset mirrors backPanel computeChecksum ──
export function checksumSubset(kind: PackageResourceKind, body: Record<string, unknown>): unknown {
  switch (kind) {
    case 'workOrders': return { _id: body._id, version: body.version ?? 0, estado: body.estado }
    case 'installations': return { _id: body._id, nombre: body.nombre }
    case 'forms': return { _id: body._id, version: body.version, campos: body.campos }
    default: return { _id: body._id, name: body.name }
  }
}

export type ChecksumVerificationResult =
  | { ok: boolean; code?: 'checksum_mismatch' | 'form_version_mismatch'; kind?: PackageResourceKind; index?: number }

/** Checksums for a kind; the backend buckets inventory refs under `inventory`. */
function manifestChecksumsFor(manifest: OfflineManifest, kind: PackageResourceKind): string[] {
  return manifest.resourceChecksums?.[kind] ?? (kind === 'inventoryRefs' ? manifest.resourceChecksums?.inventory ?? [] : [])
}

export async function verifyResourceChecksums(
  manifest: OfflineManifest, resources: Record<string, Array<Record<string, unknown>>>
): Promise<ChecksumVerificationResult> {
  for (const kind of CHECKSUMMED_KINDS) {
    const expected = manifestChecksumsFor(manifest, kind)
    const records = resources[kind] ?? []
    if (records.length !== expected.length) return { ok: false, code: 'checksum_mismatch', kind, index: -1 }
    for (let i = 0; i < records.length; i++) {
      const body = records[i]
      if ((await sha256HexCanonical(checksumSubset(kind, body))) !== expected[i]) return { ok: false, code: 'checksum_mismatch', kind, index: i }
      if (kind === 'forms') {
        const comp = manifest.completeness?.[String(body._id)]
        if (comp && comp.version !== undefined && body.version !== comp.version) return { ok: false, code: 'form_version_mismatch', kind, index: i }
      }
    }
  }
  return { ok: true }
}

// ── Bootstrap ingestion: verify → atomic persistence → readiness ──
async function ingestBootstrap(data: OfflineBootstrap, scope: OfflineIdentityScope, nowMs: number): Promise<{ packageId: string; manifest: OfflineManifest; ready: boolean }> {
  const manifest = data?.manifest
  const resources: Record<string, Array<Record<string, unknown>>> = {
    workOrders: data?.workOrders ?? [], installations: data?.installations ?? [], assets: data?.assets ?? [],
    forms: data?.forms ?? [], inventoryRefs: data?.inventoryRefs ?? [],
  }
  const verification = await verifyManifest(manifest, scope, await getCachedVerificationKeys(), nowMs)
  if (!verification.ok) {
    if (verification.code !== 'form_not_delivered') throw new PackageError(verification.code)
  }
  const checksums = await verifyResourceChecksums(manifest, resources)
  if (!checksums.ok) throw new PackageError(checksums.code, `${checksums.kind}:${checksums.index}`)
  const ready = verification.ok
  const scopeKey = buildScopeKey(scope)
  const stored: StoredResourceRecord[] = []
  for (const kind of RESOURCE_KINDS) {
    const checksumList = manifest.resourceChecksums?.[kind] ?? []
    for (let i = 0; i < resources[kind].length; i++) {
      const body = resources[kind][i]
      const resourceId = String(body._id ?? body.id ?? i)
      stored.push({
        id: resourceRecordId(scopeKey, kind, resourceId), scopeKey, packageId: manifest.packageId, kind, resourceId,
        body, version: typeof body.version === 'number' ? body.version : undefined, checksum: checksumList[i], verified: true, deliveredAt: nowMs,
      })
    }
  }
  const pkg: StoredPackageRecord = {
    packageId: manifest.packageId, manifest, cursor: manifest.cursor, version: manifest.packageVersion, ready,
    downloadedAt: nowMs, lastSyncedAt: nowMs, freshness: computeFreshness(nowMs, manifest.expiresAt), ownerScope: scope,
  }
  const progress: DownloadProgressRecord = {
    packageId: manifest.packageId, totalResources: stored.length, completedResources: stored.length, failedResources: 0,
    status: 'completed', startedAt: nowMs, updatedAt: nowMs,
  }
  await persistPackageBundle({ scopeKey, pkg, resources: stored, progress })
  return { packageId: manifest.packageId, manifest, ready }
}

async function purgePackage(packageId: string, scopeKey: string): Promise<void> {
  await deleteResources(scopeKey, packageId)
  await deletePackageRecord(packageId)
  await deleteProgressRecord(packageId)
}

// ── Public API ───────────────────────────────────────────────────────────

export async function preparePackage(orderId?: string): Promise<{ packageId: string; manifest: OfflineManifest; ready: boolean }> {
  const auth = await getPackageScope()
  if (!auth.ok) throw new PackageError(auth.code)
  const body: Record<string, unknown> = { deviceId: auth.scope.deviceId }
  if (orderId !== undefined && orderId !== '') body.orderId = orderId
  const data = await postPackage<OfflineBootstrap>('/packages/prepare', body)
  return ingestBootstrap(data, auth.scope, Date.now())
}

export async function refreshPackage(packageId: string): Promise<{ packageId: string; manifest: OfflineManifest; ready: boolean }> {
  const auth = await getPackageScope()
  if (!auth.ok) throw new PackageError(auth.code)
  const data = await postPackage<OfflineBootstrap>('/packages/refresh', { packageId, deviceId: auth.scope.deviceId })
  const result = await ingestBootstrap(data, auth.scope, Date.now())
  await purgePackage(packageId, buildScopeKey(auth.scope)) // replaced package is removed
  return result
}

export async function resumeDownload(packageId: string): Promise<void> {
  const auth = await getPackageScope()
  if (!auth.ok) throw new PackageError(auth.code)
  const scopeKey = buildScopeKey(auth.scope)
  const pkg = await getPackageRecord(packageId)
  if (!pkg) throw new PackageError('no-package')
  // Interrupted-resume integrity: persisted bootstrap bodies must still match signed checksums.
  const records = await getResourceRecordsForScope(scopeKey)
  for (const kind of CHECKSUMMED_KINDS) {
    const expected = manifestChecksumsFor(pkg.manifest, kind)
    const list = records.filter(r => r.kind === kind && r.verified)
    if (list.length !== expected.length) { await purgePackage(packageId, scopeKey); await preparePackage(); return }
    for (let i = 0; i < list.length; i++) {
      if ((await sha256HexCanonical(checksumSubset(kind, list[i].body))) !== expected[i]) { await purgePackage(packageId, scopeKey); await preparePackage(); return }
    }
  }
  try {
    const data = await postPackage<OfflineDeltaResponse>('/packages/delta', { packageId, deviceId: auth.scope.deviceId, clientCursor: pkg.cursor, limit: DELTA_LIMIT })
    const now = Date.now()
    await putPackageRecord({ ...pkg, cursor: data.nextCursor ?? pkg.cursor, lastSyncedAt: now, freshness: computeFreshness(now, pkg.manifest.expiresAt) })
    const progress = await getProgressRecord(packageId)
    await putProgressRecord({ ...progress, completedResources: progress?.totalResources ?? 0, status: 'completed', updatedAt: now })
  } catch (error) {
    if (error instanceof PackageError && (error.code === 'CURSOR_EXPIRED' || error.code === 'PACKAGE_EXPIRED')) {
      await purgePackage(packageId, scopeKey)
      await preparePackage() // safe re-bootstrap; local drafts are never touched
      return
    }
    const progress = await getProgressRecord(packageId)
    await putProgressRecord({ ...progress, status: 'error', lastError: error instanceof Error ? error.message : 'Unknown', updatedAt: Date.now() })
    throw error
  }
}

/** Load a stored package, applying the scope/binding gate (no expiry yet). */
async function loadScopedPackage(packageId: string): Promise<{ pkg?: StoredPackageRecord; reason?: 'no-package' | 'not-ready' | 'no-device' | 'binding-mismatch' }> {
  const pkg = await getPackageRecord(packageId)
  if (!pkg) return { reason: 'no-package' }
  if (!pkg.ready) return { reason: 'not-ready' }
  const auth = await getPackageScope()
  if (!auth.ok) return { reason: 'no-device' }
  if (!pkg.ownerScope || buildScopeKey(pkg.ownerScope) !== buildScopeKey(auth.scope)) return { reason: 'binding-mismatch' }
  return { pkg }
}

export async function isPackageReady(packageId: string): Promise<boolean> {
  const loaded = await loadScopedPackage(packageId)
  const pkg = loaded.pkg
  if (!pkg) return false
  if (Date.parse(pkg.manifest.expiresAt) <= Date.now()) return false
  const mine = (await getResourceRecordsForScope(buildScopeKey(pkg.ownerScope))).filter(r => r.packageId === packageId)
  return CHECKSUMMED_KINDS.every(kind => mine.filter(r => r.kind === kind).length === manifestChecksumsFor(pkg.manifest, kind).length)
}

export async function canUsePackage(packageId: string, nowMs?: number): Promise<{ ok: boolean; reason?: 'no-package' | 'not-ready' | 'no-device' | 'binding-mismatch' | 'expired' }> {
  const loaded = await loadScopedPackage(packageId)
  if (!loaded.pkg) return { ok: false, reason: loaded.reason }
  if (Date.parse(loaded.pkg.manifest.expiresAt) <= (nowMs ?? Date.now())) return { ok: false, reason: 'expired' }
  return { ok: true }
}

export const getDownloadProgress = (packageId: string) => getProgressRecord(packageId)
export const getStoredPackage = (packageId: string) => getPackageRecord(packageId)

export async function getScopedPackages(): Promise<StoredPackageRecord[]> {
  const auth = await getPackageScope()
  if (!auth.ok) return []
  const sk = buildScopeKey(auth.scope)
  return (await getAllPackageRecords()).filter(p => p.ownerScope && buildScopeKey(p.ownerScope) === sk)
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
  const oldest = pkgs.reduce((a, b) => (a.downloadedAt < b.downloadedAt ? a : b))
  await purgePackage(oldest.packageId, buildScopeKey(oldest.ownerScope!))
}

export async function purgePackagesForScope(scope: OfflineIdentityScope): Promise<void> {
  const sk = buildScopeKey(scope)
  for (const p of (await getAllPackageRecords()).filter(p => p.ownerScope && buildScopeKey(p.ownerScope) === sk)) {
    await deletePackageRecord(p.packageId)
    await deleteProgressRecord(p.packageId)
  }
  await deleteResources(sk)
}

function computeFreshness(lastSyncedAt: number, expiresAt: string): 'fresh' | 'stale' | 'expired' {
  if (new Date(expiresAt) < new Date()) return 'expired'
  return Date.now() - lastSyncedAt > STALE_THRESHOLD_MS ? 'stale' : 'fresh'
}

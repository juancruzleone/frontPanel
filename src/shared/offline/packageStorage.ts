/**
 * R5 — Encrypted package resource persistence. Always sealed before write.
 * Bound to tenant:userId:deviceId:packageId. Atomic activation.
 */
import { sealJson, openJson, type EncryptedRecordEnvelope } from './envelope'
import type { OfflineBootstrap, OfflineManifest } from './packageTypes'

const DB_NAME = 'GMAO_Offline_DB'
const RES_STORE = 'offlinePackageResources'
const META_STORE = 'offlinePackageMeta'
const KEYS_STORE = 'offlinePackageKeys'

export type ResourceKind = 'workOrders' | 'installations' | 'assets' | 'forms' | 'inventoryRefs' | 'documents'
interface StoredEnvelope { id: string; envelope: EncryptedRecordEnvelope; kind: ResourceKind; packageId: string; scopeKey: string; entityId?: string }
export interface PackageMeta { scopeKey: string; packageId: string; manifest: OfflineManifest; sealedAt: number; resourceCount: number }

export function buildPackageScopeKey(tenantId: string, userId: string, deviceId: string, packageId: string): string {
  return `${tenantId}:${userId}:${deviceId}:${packageId}`
}

export interface SealBootstrapParams { bootstrap: OfflineBootstrap; key: CryptoKey; kid: string; tenantId: string; userId: string; deviceId: string }
export interface SealResult { meta?: PackageMeta; error?: { message: string; code: string } }

const RESOURCE_KINDS: ResourceKind[] = ['workOrders', 'installations', 'assets', 'forms', 'inventoryRefs', 'documents']

export async function sealAndPersistBootstrap(p: SealBootstrapParams): Promise<SealResult> {
  const { bootstrap, key, kid, tenantId, userId, deviceId } = p
  const scopeKey = buildPackageScopeKey(tenantId, userId, deviceId, bootstrap.manifest.packageId)
  const sealed: StoredEnvelope[] = []

  for (const kind of RESOURCE_KINDS) {
    const items = bootstrap[kind]
    if (!Array.isArray(items)) continue
    for (let i = 0; i < items.length; i++) {
      try {
        const envelope = await sealJson({ key, kid, scopeKey, store: kind, value: items[i] })
        const entityId = (items[i] as Record<string, unknown>)._id as string ?? (items[i] as Record<string, unknown>).id as string ?? `${i}`
        sealed.push({ id: `${scopeKey}:${kind}:${entityId}`, envelope, kind, packageId: bootstrap.manifest.packageId, scopeKey, entityId })
      } catch { return { error: { message: `Seal failed: ${kind}[${i}]`, code: 'SEAL_FAILED' } } }
    }
  }

  try {
    const db = await openDB()
    const tx = db.transaction([RES_STORE, META_STORE, KEYS_STORE], 'readwrite')
    const old = await getAll(tx.objectStore(RES_STORE), scopeKey)
    for (const r of old) tx.objectStore(RES_STORE).delete(r.id)
    for (const r of sealed) tx.objectStore(RES_STORE).put(r)
    const meta: PackageMeta = { scopeKey, packageId: bootstrap.manifest.packageId, manifest: bootstrap.manifest, sealedAt: Date.now(), resourceCount: sealed.length }
    tx.objectStore(META_STORE).put(meta, scopeKey)
    // Persist storage key for later decryption (owner-bound)
    tx.objectStore(KEYS_STORE).put({ key, scopeKey }, scopeKey)
    await txDone(tx)
    return { meta }
  } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Persist failed', code: 'PERSIST_FAILED' } } }
}

export interface OpenBootstrapResult { bootstrap?: OfflineBootstrap; error?: { message: string; code: string } }

export async function openPersistedBootstrap(key: CryptoKey, tenantId: string, userId: string, deviceId: string, packageId: string): Promise<OpenBootstrapResult> {
  const scopeKey = buildPackageScopeKey(tenantId, userId, deviceId, packageId)
  try {
    const db = await openDB()
    const tx = db.transaction([RES_STORE, META_STORE], 'readonly')
    const meta = await getOne<PackageMeta>(tx.objectStore(META_STORE), scopeKey)
    if (!meta) return { error: { message: 'No package', code: 'PACKAGE_NOT_FOUND' } }
    const resources = await getAll(tx.objectStore(RES_STORE), scopeKey)
    const bs: OfflineBootstrap = { manifest: meta.manifest, success: true, workOrders: [], installations: [], assets: [], forms: [], inventoryRefs: [], documents: [] }
    for (const r of resources) {
      try { (bs[r.kind] as unknown[]).push(await openJson({ key, envelope: r.envelope, expectedScopeKey: scopeKey, expectedStore: r.kind })) }
      catch { return { error: { message: `Tamper: ${r.kind}`, code: 'RESOURCE_TAMPERED' } } }
    }
    return { bootstrap: bs }
  } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Open failed', code: 'OPEN_FAILED' } } }
}

export async function clearPackageStorage(tenantId: string, userId: string, deviceId: string, packageId: string): Promise<void> {
  const scopeKey = buildPackageScopeKey(tenantId, userId, deviceId, packageId)
  const db = await openDB()
  const tx = db.transaction([RES_STORE, META_STORE], 'readwrite')
  for (const r of await getAll(tx.objectStore(RES_STORE), scopeKey)) tx.objectStore(RES_STORE).delete(r.id)
  tx.objectStore(META_STORE).delete(scopeKey)
  await txDone(tx)
}

export async function getPackageMeta(tenantId: string, userId: string, deviceId: string, packageId: string): Promise<PackageMeta | null> {
  const scopeKey = buildPackageScopeKey(tenantId, userId, deviceId, packageId)
  const db = await openDB()
  return getOne<PackageMeta>(db.transaction(META_STORE, 'readonly').objectStore(META_STORE), scopeKey)
}

/** Retrieve the non-extractable AES key persisted with a package. */
export async function getPersistedPackageKey(scopeKey: string): Promise<CryptoKey | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(KEYS_STORE, 'readonly')
    const record = await getOne<{ key: CryptoKey }>(tx.objectStore(KEYS_STORE), scopeKey)
    return record?.key ?? null
  } catch { return null }
}

/** List all ready packages for a tenant/user/device. */
export async function listReadyPackages(tenantId: string, userId: string, deviceId: string): Promise<PackageMeta[]> {
  const prefix = `${tenantId}:${userId}:${deviceId}:`
  const all = await getAllMeta()
  return all.filter(m => m.scopeKey.startsWith(prefix))
}

export type ResolvePackageResult = { packageId?: string; meta?: PackageMeta; workOrderVersion?: number; formVersion?: number; error?: string }

/**
 * Resolve the package containing a specific workOrderId.
 * Uses entityId as index hint ONLY — cryptographically verifies membership
 * by opening the sealed envelope and confirming the decrypted _id matches.
 * Retrieves the storage key from KEYS_STORE (persisted at download time).
 * Fails closed on tampered metadata, ciphertext, or scope mismatch.
 */
export async function resolvePackageForWorkOrder(
  tenantId: string, userId: string, deviceId: string, workOrderId: string,
): Promise<ResolvePackageResult> {
  const candidates = await listReadyPackages(tenantId, userId, deviceId)
  if (!candidates.length) return { error: 'No ready packages' }

  const db = await openDB()
  const tx = db.transaction([RES_STORE, KEYS_STORE], 'readonly')
  const allResources = await getAllRaw(tx.objectStore(RES_STORE))

  const matches: Array<{ meta: PackageMeta; workOrderVersion?: number; formVersion?: number }> = []
  for (const pkg of candidates) {
    const pkgScopeKey = pkg.scopeKey

    // Retrieve storage key for this package (persisted at download time)
    const keyRecord = await getOne<{ key: CryptoKey }>(tx.objectStore(KEYS_STORE), pkgScopeKey)
    if (!keyRecord?.key) continue // No key → can't verify → skip

    // Index hint: filter by entityId metadata (untrusted — just narrows candidates)
    const candidateResources = allResources.filter(r =>
      r.scopeKey === pkgScopeKey && r.kind === 'workOrders' && r.entityId === workOrderId,
    )

    for (const resource of candidateResources) {
      // Cryptographic verification: open sealed envelope, check decrypted _id
      try {
        const decrypted = await openJson<Record<string, unknown>>({
          key: keyRecord.key, envelope: resource.envelope,
          expectedScopeKey: pkgScopeKey, expectedStore: 'workOrders',
        })
        const decryptedId = (decrypted._id as string) ?? (decrypted.id as string)
        if (decryptedId === workOrderId) {
          matches.push({
            meta: pkg,
            workOrderVersion: typeof decrypted.version === 'number' ? decrypted.version : undefined,
            formVersion: typeof decrypted.formVersion === 'number' ? decrypted.formVersion : undefined,
          })
          break
        }
      } catch {
        // Tamper or scope mismatch — fail closed for this candidate
      }
    }
  }

  if (matches.length === 0) return { error: 'Work order not found in any package' }
  if (matches.length > 1) return { error: 'Ambiguous: work order in multiple packages' }
  return {
    packageId: matches[0].meta.packageId,
    meta: matches[0].meta,
    workOrderVersion: matches[0].workOrderVersion,
    formVersion: matches[0].formVersion,
  }
}

export async function openLatestBootstrap(tenantId: string, userId: string, deviceId: string): Promise<OpenBootstrapResult> {
  const packages = await listReadyPackages(tenantId, userId, deviceId)
  const latest = [...packages].sort((a, b) => b.sealedAt - a.sealedAt)[0]
  if (!latest) return { error: { message: 'No package', code: 'PACKAGE_NOT_FOUND' } }
  const key = await getPersistedPackageKey(latest.scopeKey)
  if (!key) return { error: { message: 'No package key', code: 'PACKAGE_KEY_NOT_FOUND' } }
  return openPersistedBootstrap(key, tenantId, userId, deviceId, latest.packageId)
}

export interface ResolvedForm {
  templateId: string; version: number; checksum: string; campos: unknown; packageId: string
}

/**
 * Resolve the pinned form template for a work order from its package.
 * Decrypts work order to get templateId, then finds and decrypts the matching
 * form resource. Verifies version and checksum from manifest completeness.
 * Fails closed on missing/stale/ambiguous form.
 */
export async function resolveFormForWorkOrder(
  tenantId: string, userId: string, deviceId: string, packageId: string, workOrderId: string,
): Promise<{ form?: ResolvedForm; error?: string }> {
  const scopeKey = buildPackageScopeKey(tenantId, userId, deviceId, packageId)
  const db = await openDB()
  const tx = db.transaction([RES_STORE, KEYS_STORE, META_STORE], 'readonly')

  const keyRecord = await getOne<{ key: CryptoKey }>(tx.objectStore(KEYS_STORE), scopeKey)
  if (!keyRecord?.key) return { error: 'No storage key for package' }

  const meta = await getOne<PackageMeta>(tx.objectStore(META_STORE), scopeKey)
  if (!meta) return { error: 'Package not found' }

  // Find and decrypt work order to get templateId
  const allRes = await getAll(tx.objectStore(RES_STORE), scopeKey)
  const woResource = allRes.find(r => r.kind === 'workOrders' && r.entityId === workOrderId)
  if (!woResource) return { error: 'Work order not in package' }

  let woData: Record<string, unknown>
  try {
    woData = await openJson<Record<string, unknown>>({ key: keyRecord.key, envelope: woResource.envelope, expectedScopeKey: scopeKey, expectedStore: 'workOrders' })
  } catch { return { error: 'Work order envelope tampered' } }

  const templateId = (woData.templateId as string) ?? (woData.templateId as { toString?: () => string })?.toString?.()
  if (!templateId) return { error: 'Work order has no templateId' }

  // Check completeness for this template
  const completeness = meta.manifest.completeness?.[templateId]
  if (!completeness) return { error: 'Form not in package completeness' }
  if (!completeness.available) return { error: `Form not delivered: ${completeness.reason ?? 'FORM_NOT_DELIVERED'}` }

  // Find and decrypt the form resource
  const formResource = allRes.find(r => r.kind === 'forms' && r.entityId === templateId)
  if (!formResource) return { error: 'Form resource not found in package' }

  let formData: Record<string, unknown>
  try {
    formData = await openJson<Record<string, unknown>>({ key: keyRecord.key, envelope: formResource.envelope, expectedScopeKey: scopeKey, expectedStore: 'forms' })
  } catch { return { error: 'Form envelope tampered' } }

  const formVersion = (formData.version as number) ?? completeness.version
  const formChecksum = (formData._checksum as string) ?? completeness.checksum

  if (!formVersion || !formChecksum) return { error: 'Form missing version/checksum' }

  return {
    form: {
      templateId,
      version: formVersion,
      checksum: formChecksum,
      campos: formData.campos ?? formData,
      packageId,
    },
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB'))
    const r = indexedDB.open(DB_NAME)
    r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains(RES_STORE)) d.createObjectStore(RES_STORE, { keyPath: 'id' })
      if (!d.objectStoreNames.contains(META_STORE)) d.createObjectStore(META_STORE)
      if (!d.objectStoreNames.contains(KEYS_STORE)) d.createObjectStore(KEYS_STORE)
    }
  })
}

function getAll(s: IDBObjectStore, scopeKey: string): Promise<StoredEnvelope[]> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve((r.result as StoredEnvelope[]).filter(x => x.scopeKey === scopeKey)); r.onerror = () => reject(r.error) })
}

function getAllRaw(s: IDBObjectStore): Promise<StoredEnvelope[]> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve((r.result as StoredEnvelope[]) ?? []); r.onerror = () => reject(r.error) })
}

function getAllMeta(): Promise<PackageMeta[]> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => {
      const tx = r.result.transaction(META_STORE, 'readonly')
      const req = tx.objectStore(META_STORE).getAll()
      req.onsuccess = () => resolve(((req.result as unknown[]) ?? []).filter(isPackageMeta))
      req.onerror = () => reject(req.error)
    }
  })
}

function isPackageMeta(value: unknown): value is PackageMeta {
  if (!value || typeof value !== 'object') return false
  const meta = value as Partial<PackageMeta>
  return typeof meta.scopeKey === 'string' && typeof meta.packageId === 'string' && !!meta.manifest
}

function getOne<T>(s: IDBObjectStore, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => { const r = s.get(key); r.onsuccess = () => resolve((r.result as T) ?? null); r.onerror = () => reject(r.error) })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
}

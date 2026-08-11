/**
 * R8 — Encrypted binary staging: blob bytes AES-GCM encrypted at rest.
 * AAD binds tenant+user+device+package+evidence. Decrypt only for upload.
 * Fail closed on tamper/scope/package mismatch.
 */
import { seal, open, sealJson, type EncryptedRecordEnvelope } from './envelope'
import { sha256Hex } from './crypto'
import { submitBinary, getBinaryResult, hashBlob, type SubmitBinaryResult } from './binarySubmit'
import type { BinaryReceipt, StagedBinaryMeta } from './binaryTypes'

const DB_NAME = 'GMAO_Offline_DB'
const STAGING_STORE = 'binaryStaging'

export type { StagedBinaryMeta }

interface StoredStagedRecord {
  id: string // tenantId:userId:deviceId:packageId:evidenceId
  metaEnvelope: EncryptedRecordEnvelope
  bytesEnvelope: EncryptedRecordEnvelope
  scopeKey: string
  evidenceId: string
  packageId: string
  contentHash: string
  contentSize: number
  contentType: string
}

export function buildBinaryScopeKey(tenantId: string, userId: string, deviceId: string, packageId: string, evidenceId: string): string {
  return `${tenantId}:${userId}:${deviceId}:${packageId}:${evidenceId}`
}

/** Stage blob: encrypt bytes with AES-GCM (AAD binds full scope), seal metadata. */
export async function stageBinary(
  params: { evidenceId: string; commandId: string; orderId: string; packageId: string; blob: Blob; fileName?: string },
  key: CryptoKey, kid: string, tenantId: string, userId: string, deviceId: string,
): Promise<{ meta?: StagedBinaryMeta; error?: string }> {
  const { evidenceId, commandId, orderId, packageId, blob, fileName } = params
  const scopeKey = buildBinaryScopeKey(tenantId, userId, deviceId, packageId, evidenceId)
  const contentHash = await hashBlob(blob)

  const bytes = new Uint8Array(await blob.arrayBuffer())
  const bytesEnvelope = await seal({ key, kid, scopeKey, store: `${STAGING_STORE}:bytes`, plaintext: bytes })

  const meta: StagedBinaryMeta = {
    evidenceId, commandId, orderId, packageId,
    contentHash, contentSize: blob.size, contentType: blob.type,
    fileName: fileName ?? null, scopeKey, stagedAt: Date.now(),
  }
  const metaEnvelope = await sealJson({ key, kid, scopeKey, store: `${STAGING_STORE}:meta`, value: meta })

  const record: StoredStagedRecord = {
    id: scopeKey, metaEnvelope, bytesEnvelope, scopeKey, evidenceId, packageId,
    contentHash, contentSize: blob.size, contentType: blob.type,
  }

  try {
    await persistStaged(record)
    return { meta }
  } catch (e) { return { error: e instanceof Error ? e.message : 'Stage failed' } }
}

/** Submit staged binary: decrypt bytes, verify hash, upload. Fail closed on tamper/scope. */
export async function submitStagedBinary(
  key: CryptoKey, scopeKey: string, tenantId: string, actorId: string,
): Promise<SubmitBinaryResult & { decrypted?: boolean }> {
  const stored = await findStaged(scopeKey)
  if (!stored) return { status: 'no_trust', error: 'No staged binary for scope' }

  let meta: StagedBinaryMeta
  try {
    const metaBytes = await open({ key, envelope: stored.metaEnvelope, expectedScopeKey: scopeKey, expectedStore: `${STAGING_STORE}:meta` })
    meta = JSON.parse(new TextDecoder().decode(metaBytes)) as StagedBinaryMeta
  } catch { return { status: 'no_trust', error: 'Metadata tampered or scope mismatch' } }

  let bytes: Uint8Array
  try {
    bytes = await open({ key, envelope: stored.bytesEnvelope, expectedScopeKey: scopeKey, expectedStore: `${STAGING_STORE}:bytes` })
  } catch { return { status: 'no_trust', error: 'Bytes tampered or scope mismatch' } }

  const computedHash = await sha256Hex(bytes)
  if (computedHash !== meta.contentHash) return { status: 'hash_mismatch', error: 'Decrypted bytes hash mismatch' }

  const blob = new Blob([bytes], { type: meta.contentType })
  const result = await submitBinary({
    evidenceId: meta.evidenceId, commandId: meta.commandId,
    orderId: meta.orderId, packageId: meta.packageId,
    blob, fileName: meta.fileName ?? undefined,
  }, tenantId, actorId)

  return { ...result, decrypted: true }
}

/** Cleanup: remove only after receipt confirmed. */
export async function cleanupStagedBinary(evidenceId: string, key: CryptoKey, tenantId: string, userId: string, deviceId: string, packageId: string): Promise<boolean> {
  const scopeKey = buildBinaryScopeKey(tenantId, userId, deviceId, packageId, evidenceId)
  if (!(await findStaged(scopeKey))) return false
  if (!(await getBinaryResult(evidenceId)).receipt) return false
  await deleteStaged(scopeKey)
  return true
}

/** List staged binaries by prefix. */
export async function listStagedBinaries(prefix: string): Promise<Array<{ evidenceId: string; packageId: string; scopeKey: string }>> {
  return (await getAllStaged()).filter(s => s.scopeKey.startsWith(prefix)).map(s => ({ evidenceId: s.evidenceId, packageId: s.packageId, scopeKey: s.scopeKey }))
}

/** Purge without receipt check (identity switch). */
export async function purgeStagedBinary(evidenceId: string, tenantId: string, userId: string, deviceId: string, packageId: string): Promise<void> {
  await deleteStaged(buildBinaryScopeKey(tenantId, userId, deviceId, packageId, evidenceId))
}

export interface StageEvidenceResult {
  evidenceIds: string[]
  staged: number
  failed: number
  error?: string
}

/**
 * Stage device-form evidence (photos + signature) into encrypted R8 staging.
 * Evidence IDs derived from draftId + field identity — stable per draft,
 * disjoint across different drafts on the same work order.
 * On partial failure, already-staged items are preserved for retry.
 */
export async function stageEvidenceFromFormData(
  params: {
    draftId: string
    photos: Blob[]
    photoFilenames: string[]
    signatureBlob?: Blob
    tenantId: string
    userId: string
    deviceId: string
    packageId: string
  },
  key: CryptoKey, kid: string,
): Promise<StageEvidenceResult> {
  const { draftId, photos, photoFilenames, signatureBlob, tenantId, userId, deviceId, packageId } = params
  const evidenceIds: string[] = []
  let staged = 0, failed = 0

  for (let i = 0; i < photos.length; i++) {
    const evidenceId = `${draftId}-photo-${i}`
    const result = await stageBinary(
      { evidenceId, commandId: draftId, orderId: draftId, packageId, blob: photos[i], fileName: photoFilenames[i] || `foto_${i}.jpg` },
      key, kid, tenantId, userId, deviceId,
    )
    if (result.meta) { evidenceIds.push(evidenceId); staged++ }
    else failed++
  }

  if (signatureBlob) {
    const evidenceId = `${draftId}-firma`
    const result = await stageBinary(
      { evidenceId, commandId: draftId, orderId: draftId, packageId, blob: signatureBlob, fileName: 'firma.png' },
      key, kid, tenantId, userId, deviceId,
    )
    if (result.meta) { evidenceIds.push(evidenceId); staged++ }
    else failed++
  }

  return { evidenceIds, staged, failed, error: failed > 0 ? `${failed} evidence items failed to stage` : undefined }
}

// ── IndexedDB ───────────────────────────────────────────────────────────

async function persistStaged(rec: StoredStagedRecord): Promise<void> {
  const db = await openDB(); const tx = db.transaction(STAGING_STORE, 'readwrite')
  tx.objectStore(STAGING_STORE).put(rec, rec.id); await txDone(tx)
}
async function findStaged(scopeKey: string): Promise<StoredStagedRecord | null> {
  const db = await openDB(); const tx = db.transaction(STAGING_STORE, 'readonly')
  return getOne<StoredStagedRecord>(tx.objectStore(STAGING_STORE), scopeKey)
}
async function deleteStaged(scopeKey: string): Promise<void> {
  const db = await openDB(); const tx = db.transaction(STAGING_STORE, 'readwrite')
  tx.objectStore(STAGING_STORE).delete(scopeKey); await txDone(tx)
}
async function getAllStaged(): Promise<StoredStagedRecord[]> {
  const db = await openDB(); const tx = db.transaction(STAGING_STORE, 'readonly')
  return getAll<StoredStagedRecord>(tx.objectStore(STAGING_STORE))
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB'))
    const r = indexedDB.open(DB_NAME); r.onerror = () => reject(r.error); r.onsuccess = () => resolve(r.result)
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STAGING_STORE)) r.result.createObjectStore(STAGING_STORE) }
  })
}
function getOne<T>(s: IDBObjectStore, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => { const r = s.get(key); r.onsuccess = () => resolve((r.result as T) ?? null); r.onerror = () => reject(r.error) })
}
function getAll<T>(s: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => { const r = s.getAll(); r.onsuccess = () => resolve(r.result as T[]); r.onerror = () => reject(r.error) })
}
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
}

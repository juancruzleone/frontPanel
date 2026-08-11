/**
 * R8 — Binary evidence submission client.
 * Two-phase: 1) metadata binding (POST /binaries), 2) byte upload (POST /uploads/binary).
 * Local binary NOT deleted until both phases succeed.
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import { sha256Hex } from './crypto'
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredLease } from './leaseGate'
import type { BinaryReceipt } from './binaryTypes'
import { BINARY_ERROR_CODES, BINARY_MAX_SIZE_BYTES, ALLOWED_CONTENT_TYPES } from './binaryTypes'

const API = '/api/offline'
const UPLOAD_API = '/api/uploads'

export type SubmitBinaryStatus = 'submitted' | 'uploaded' | 'upload_failed' | 'duplicate' | 'hash_mismatch' | 'size_mismatch'
  | 'invalid_type' | 'size_exceeded' | 'device_error' | 'lease_error' | 'binding_error'
  | 'no_trust' | 'network_error'

export interface SubmitBinaryResult {
  status: SubmitBinaryStatus
  receipt?: BinaryReceipt
  error?: string
}

export interface SubmitBinaryParams {
  evidenceId: string
  commandId: string
  orderId: string
  packageId: string
  blob: Blob
  fileName?: string
}

/**
 * Phase 1: Register metadata binding (POST /api/offline/binaries).
 * Phase 2: Upload actual bytes (POST /api/uploads/binary, multipart).
 * Returns receipt only after both phases succeed. Local blob preserved until then.
 */
export async function submitBinary(params: SubmitBinaryParams, tenantId: string, actorId: string): Promise<SubmitBinaryResult> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { status: 'no_trust', error: 'Device not ready' }

  if (!ALLOWED_CONTENT_TYPES.includes(params.blob.type)) return { status: 'invalid_type', error: `Content type not allowed: ${params.blob.type}` }
  if (params.blob.size > BINARY_MAX_SIZE_BYTES) return { status: 'size_exceeded', error: `Size exceeds max: ${params.blob.size} > ${BINARY_MAX_SIZE_BYTES}` }

  const contentHash = await hashBlob(params.blob)
  const lease = await getStoredLease()

  // Phase 1: metadata binding
  try {
    const res = await fetchWithAuthRetry(`${API}/binaries`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId: params.evidenceId, commandId: params.commandId, orderId: params.orderId,
        packageId: params.packageId, deviceId: trust.deviceId,
        contentHash, contentSize: params.blob.size, contentType: params.blob.type,
        fileName: params.fileName,
        lease: lease?.lease, leaseHeader: lease?.header, leaseSignature: lease?.signature,
      }),
    })

    const body = await parseRes(res)
    if (!res.ok) {
      const code = (body.error as { code?: string })?.code
      const message = (body.error as { message?: string })?.message ?? `HTTP ${res.status}`
      return { status: classifyError(code, res.status), error: `${code}: ${message}` }
    }

    const receipt = body.receipt as BinaryReceipt

    // Phase 2: upload actual bytes (multipart)
    const uploadResult = await uploadBinaryContent(params.blob, params.evidenceId)
    if (!uploadResult.ok) {
      // Metadata binding succeeded but upload failed — receipt exists, bytes pending
      return { status: 'upload_failed', receipt, error: uploadResult.error }
    }

    return { status: 'submitted', receipt }
  } catch (e) {
    return { status: 'network_error', error: e instanceof Error ? e.message : 'Network error' }
  }
}

/** GET /api/offline/binaries/:evidenceId — durable receipt lookup. */
export async function getBinaryResult(evidenceId: string): Promise<{ receipt?: BinaryReceipt; error?: string }> {
  try {
    const res = await fetchWithAuthRetry(`${API}/binaries/${encodeURIComponent(evidenceId)}`, { method: 'GET', credentials: 'include' })
    const body = await parseRes(res)
    if (!res.ok) return { error: (body.error as { message?: string })?.message ?? `HTTP ${res.status}` }
    return { receipt: body.receipt as BinaryReceipt }
  } catch (e) { return { error: e instanceof Error ? e.message : 'Network error' } }
}

/** Compute SHA-256 of a blob for local verification before submission. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  return sha256Hex(new Uint8Array(buf))
}

/** Upload actual bytes via multipart POST /api/uploads/binary. */
async function uploadBinaryContent(blob: Blob, binaryId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData()
    form.append('file', blob)
    form.append('binaryId', binaryId)
    const res = await fetchWithAuthRetry(`${UPLOAD_API}/binary`, {
      method: 'POST', credentials: 'include', body: form,
    })
    if (res.ok) return { ok: true }
    const body = await parseRes(res)
    return { ok: false, error: (body.error as { message?: string })?.message ?? `Upload HTTP ${res.status}` }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Upload network error' } }
}

function classifyError(code: string | undefined, status: number): SubmitBinaryStatus {
  if (code === BINARY_ERROR_CODES.DUPLICATE_EVIDENCE_ID) return 'duplicate'
  if (code === BINARY_ERROR_CODES.HASH_MISMATCH) return 'hash_mismatch'
  if (code === BINARY_ERROR_CODES.SIZE_MISMATCH) return 'size_mismatch'
  if (code === BINARY_ERROR_CODES.INVALID_CONTENT_TYPE) return 'invalid_type'
  if (code === BINARY_ERROR_CODES.SIZE_EXCEEDED) return 'size_exceeded'
  if (code === BINARY_ERROR_CODES.CROSS_COMMAND_BINDING) return 'binding_error'
  if (code === BINARY_ERROR_CODES.DEVICE_NOT_REGISTERED || code === BINARY_ERROR_CODES.DEVICE_REVOKED || code === BINARY_ERROR_CODES.OWNERSHIP_MISMATCH) return 'device_error'
  if (code === BINARY_ERROR_CODES.LEASE_EXPIRED || code === BINARY_ERROR_CODES.LEASE_INVALID) return 'lease_error'
  if (status === 409) return 'duplicate'
  if (status === 413) return 'size_exceeded'
  if (status === 403) return 'device_error'
  if (status === 410) return 'lease_error'
  return 'hash_mismatch'
}

async function parseRes(r: Response): Promise<Record<string, unknown>> { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }

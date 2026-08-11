/**
 * R8 — Evidence-to-command flow: stage binary → record evidence command →
 * submit evidence with binary link. Independent from completion (backend
 * does not enforce evidence-before-completion). Client may set dependsOn.
 */
import { stageBinary, submitStagedBinary, cleanupStagedBinary, buildBinaryScopeKey, type StagedBinaryMeta } from './binaryStaging'
import { recordCommand, hashCanonicalPayload } from './commandJournal'
import type { CommandType } from './commandTypes'

export interface CaptureEvidenceParams {
  evidenceId: string
  orderId: string
  packageId: string
  workOrderId: string
  blob: Blob
  fileName?: string
  dependsOn?: string[] // optional: e.g., ['start-cmd-1'] for ordering
}

export interface EvidenceFlowResult {
  status: 'staged' | 'submitted' | 'failed'
  meta?: StagedBinaryMeta
  error?: string
}

/**
 * Capture and stage evidence binary. Returns staging metadata.
 * Binary is encrypted at rest (AES-GCM, AAD=scope). No network call.
 */
export async function captureAndStageEvidence(
  params: CaptureEvidenceParams,
  key: CryptoKey, kid: string,
  tenantId: string, userId: string, deviceId: string,
): Promise<EvidenceFlowResult> {
  const { evidenceId, orderId, packageId, workOrderId, blob, fileName, dependsOn } = params
  const scopeKey = buildBinaryScopeKey(tenantId, userId, deviceId, packageId, evidenceId)

  const result = await stageBinary(
    { evidenceId, commandId: `evidence-${evidenceId}`, orderId, packageId, blob, fileName },
    key, kid, tenantId, userId, deviceId,
  )

  if (result.error) return { status: 'failed', error: result.error }
  return { status: 'staged', meta: result.meta }
}

/**
 * Submit evidence command with binary link.
 * Records command intent (encrypted), then submits binary (metadata + upload).
 * Returns receipt or error. Binary preserved until receipt.
 */
export async function submitEvidenceCommand(
  params: CaptureEvidenceParams,
  key: CryptoKey, kid: string,
  tenantId: string, actorId: string, deviceId: string, packageId: string,
): Promise<EvidenceFlowResult & { commandId?: string }> {
  const { evidenceId, orderId, workOrderId, dependsOn } = params
  const scopeKey = buildBinaryScopeKey(tenantId, actorId, deviceId, packageId, evidenceId)
  const commandId = `evidence-${evidenceId}`

  // 1. Record evidence command intent (encrypted in journal)
  const payload = { evidenceId, orderId, workOrderId, action: 'attach_evidence' }
  const payloadHash = await hashCanonicalPayload(payload)
  const cmdResult = await recordCommand({
    commandId, commandType: 'evidence' as CommandType,
    payload, entityId: workOrderId, expectedEntityVersion: 0,
    dependsOn: dependsOn ?? [],
    tenantId, actorId, deviceId, packageId, key, kid,
  })

  if (cmdResult.error) return { status: 'failed', error: cmdResult.error.code }

  // 2. Submit binary (metadata binding + multipart upload)
  const staged = await import('./binaryStaging')
  const binaryResult = await staged.submitStagedBinary(key, scopeKey, tenantId, actorId)

  if (binaryResult.status === 'submitted') {
    // 3. Cleanup staged blob after receipt
    await cleanupStagedBinary(evidenceId, key, tenantId, actorId, deviceId, packageId)
    return { status: 'submitted', commandId }
  }

  // Binary upload failed — command intent preserved, blob staged for retry
  return { status: 'failed', error: binaryResult.error, commandId }
}

/**
 * Retry pending evidence: iterate staged binaries, submit those whose
 * commands are accepted. Does not clear unsynced intents on error.
 */
export async function retryPendingEvidence(
  key: CryptoKey,
  tenantId: string, actorId: string, deviceId: string, packageId: string,
): Promise<{ submitted: number; failed: number }> {
  const prefix = `${tenantId}:${actorId}:${deviceId}:${packageId}:`
  const staged = await (await import('./binaryStaging')).listStagedBinaries(prefix)
  let submitted = 0, failed = 0

  for (const item of staged) {
    const scopeKey = item.scopeKey
    const result = await (await import('./binaryStaging')).submitStagedBinary(key, scopeKey, tenantId, actorId)
    if (result.status === 'submitted') {
      await cleanupStagedBinary(item.evidenceId, key, tenantId, actorId, deviceId, packageId)
      submitted++
    } else {
      failed++
    }
  }

  return { submitted, failed }
}

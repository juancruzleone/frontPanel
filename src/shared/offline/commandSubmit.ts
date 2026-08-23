/**
 * R6b — Command submission client + durable receipt lookup.
 * Signs with non-extractable device private key, submits encrypted intents,
 * persists authoritative receipt/status, classifies stable backend errors.
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import { canonicalJSON } from './crypto'
import type { CommandType, CommandReceipt } from './commandTypes'
import { COMMAND_ERROR_CODES } from './commandTypes'
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredDevice } from './deviceTrust'
import { getStoredLease } from './leaseGate'

const API = '/api/offline'

export type SubmitStatus = 'submitted' | 'idempotent_replay' | 'dependency_not_met'
  | 'dependency_failed' | 'device_error' | 'lease_error' | 'payload_error'
  | 'signature_error' | 'no_trust' | 'no_device_key' | 'network_error' | 'receipt_error'

export interface SubmitResult {
  status: SubmitStatus
  receipt?: CommandReceipt
  error?: string
}

export interface SubmitCommandParams {
  commandId: string
  commandType: CommandType
  packageId: string
  entityId: string
  entityType?: string
  payload: Record<string, unknown>
  payloadHash: string
  expectedEntityVersion?: number
  expectedFormVersion?: number
  dependsOn?: string[]
}

/**
 * Submit a recorded offline command to the backend.
 * Signs canonical bytes with device private key, includes lease for trust gate.
 * Returns authoritative receipt or classified error.
 */
export async function submitCommand(params: SubmitCommandParams, tenantId: string, actorId: string): Promise<SubmitResult> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { status: 'no_trust', error: 'Device not ready' }

  // Get device private key from IndexedDB
  const deviceKey = `${tenantId}:${actorId}`
  const device = await getStoredDevice(deviceKey)
  if (!device?.privateKeyHandle) return { status: 'no_device_key', error: 'No device key' }

  // Get stored lease for trust gate
  const lease = await getStoredLease()

  // Build canonical bytes and sign with device private key
  const canonical = buildCommandCanonicalBytes({
    tenantId, actorId, deviceId: trust.deviceId, packageId: params.packageId,
    commandId: params.commandId, commandType: params.commandType,
    schemaVersion: 1, expectedEntityVersion: params.expectedEntityVersion,
    expectedFormVersion: params.expectedFormVersion, dependsOn: params.dependsOn,
    payloadHash: params.payloadHash,
  })
  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    device.privateKeyHandle,
    new TextEncoder().encode(canonical),
  )
  const deviceSignature = bytesToBase64Url(new Uint8Array(sigBuf))

  // Submit
  try {
    const res = await fetchWithAuthRetry(`${API}/packages/${encodeURIComponent(params.packageId)}/commands`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: params.commandId,
        type: params.commandType,
        packageId: params.packageId,
        deviceId: trust.deviceId,
        entityId: params.entityId,
        entityType: params.entityType,
        schemaVersion: 1,
        payload: params.payload,
        payloadHash: params.payloadHash,
        expectedEntityVersion: params.expectedEntityVersion,
        expectedFormVersion: params.expectedFormVersion,
        dependsOn: params.dependsOn ?? [],
        lease: lease?.lease,
        leaseHeader: lease?.header,
        leaseSignature: lease?.signature,
        deviceSignature,
      }),
    })

    const body = await parseRes(res)

    const receipt = authoritativeReceipt(body.receipt, params, tenantId, actorId, trust.deviceId)
    if (receipt) {
      return { status: receipt.idempotentReplay ? 'idempotent_replay' : 'submitted', receipt }
    }

    // Classify stable backend errors
    const code = (body.error as { code?: string })?.code
    const message = (body.error as { message?: string })?.message ?? `HTTP ${res.status}`
    const status = classifyError(code, res.status)
    if (res.ok || status === 'idempotent_replay') {
      return reconcileCommand(params, tenantId, actorId, trust.deviceId)
    }
    return {
      status,
      error: `${code ?? `HTTP_${res.status}`}: ${message}`,
    }
  } catch (e) {
    return { status: 'network_error', error: e instanceof Error ? e.message : 'Network error' }
  }
}

/** Reconcile a receiptless response against the durable command-result endpoint. */
export async function reconcileCommand(
  params: SubmitCommandParams, tenantId: string, actorId: string, deviceId: string,
): Promise<SubmitResult> {
  const result = await getCommandResult(params.commandId, params.commandType)
  const receipt = authoritativeReceipt(result.receipt, params, tenantId, actorId, deviceId)
  if (receipt) return { status: receipt.idempotentReplay ? 'idempotent_replay' : 'submitted', receipt }
  return { status: 'receipt_error', error: result.error ?? 'Authoritative command receipt missing or invalid' }
}

/** GET /api/offline/commands/:commandId — durable receipt lookup. */
export async function getCommandResult(commandId: string, commandType?: string): Promise<{ receipt?: CommandReceipt; error?: string }> {
  try {
    const url = `${API}/commands/${encodeURIComponent(commandId)}${commandType ? `?commandType=${commandType}` : ''}`
    const res = await fetchWithAuthRetry(url, { method: 'GET', credentials: 'include' })
    const body = await parseRes(res)
    if (!res.ok) return { error: (body.error as { message?: string })?.message ?? `HTTP ${res.status}` }
    return { receipt: body.receipt as CommandReceipt }
  } catch (e) { return { error: e instanceof Error ? e.message : 'Network error' } }
}

// ── Canonical bytes (mirrors backend buildCommandCanonicalBytes) ─────────

export function buildCommandCanonicalBytes(fields: {
  tenantId: string; actorId: string; deviceId: string; packageId: string
  commandId: string; commandType: string; schemaVersion: number
  expectedEntityVersion?: number; expectedFormVersion?: number
  dependsOn?: string[]; payloadHash: string
}): string {
  return canonicalJSON({
    tenantId: fields.tenantId,
    actorId: fields.actorId,
    deviceId: fields.deviceId,
    packageId: fields.packageId,
    commandId: fields.commandId,
    commandType: fields.commandType,
    schemaVersion: fields.schemaVersion,
    expectedEntityVersion: fields.expectedEntityVersion,
    expectedFormVersion: fields.expectedFormVersion ?? null,
    dependsOn: fields.dependsOn ? [...fields.dependsOn].sort() : [],
    payloadHash: fields.payloadHash,
  })
}

// ── Error classification ────────────────────────────────────────────────

function classifyError(code: string | undefined, status: number): SubmitStatus {
  if (code === COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED) return 'idempotent_replay'
  if (code === COMMAND_ERROR_CODES.DEPENDENCY_NOT_MET) return 'dependency_not_met'
  if (code === COMMAND_ERROR_CODES.DEPENDENCY_FAILED) return 'dependency_failed'
  if (code === COMMAND_ERROR_CODES.DEVICE_NOT_REGISTERED || code === COMMAND_ERROR_CODES.DEVICE_REVOKED || code === COMMAND_ERROR_CODES.OWNERSHIP_MISMATCH) return 'device_error'
  if (code === COMMAND_ERROR_CODES.LEASE_EXPIRED || code === COMMAND_ERROR_CODES.LEASE_INVALID) return 'lease_error'
  if (code === COMMAND_ERROR_CODES.PAYLOAD_INTEGRITY) return 'payload_error'
  if (code === COMMAND_ERROR_CODES.DEVICE_SIGNATURE_MISSING || code === COMMAND_ERROR_CODES.DEVICE_SIGNATURE_INVALID) return 'signature_error'
  if (status === 409) return 'idempotent_replay'
  if (status === 428) return 'dependency_not_met'
  if (status === 410) return 'lease_error'
  if (status === 403) return 'device_error'
  if (status === 408 || status === 429 || status >= 500) return 'network_error'
  return 'payload_error'
}

function authoritativeReceipt(
  value: unknown,
  params: SubmitCommandParams,
  tenantId: string,
  actorId: string,
  deviceId: string,
): CommandReceipt | undefined {
  if (!value || typeof value !== 'object') return undefined
  const receipt = value as Partial<CommandReceipt>
  if (
    receipt.commandId !== params.commandId ||
    receipt.commandType !== params.commandType ||
    receipt.tenantId !== tenantId ||
    receipt.actorId !== actorId ||
    receipt.deviceId !== deviceId ||
    receipt.packageId !== params.packageId ||
    receipt.entityId !== params.entityId ||
    receipt.payloadHash !== params.payloadHash ||
    typeof receipt.status !== 'string'
  ) return undefined
  return receipt as CommandReceipt
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function parseRes(r: Response): Promise<Record<string, unknown>> { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }

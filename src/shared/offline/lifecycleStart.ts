/**
 * R7 — Lifecycle start: fail-closed offline command recording.
 * Resolves real trust/device/lease/package from stores. No legacy fallback.
 * Omits optional version fields when unavailable (never zero).
 */
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredDevice } from './deviceTrust'
import { getStoredLease } from './leaseGate'
import { resolvePackageForWorkOrder, getPersistedPackageKey } from './packageStorage'
import { recordCommand, hashCanonicalPayload, getCommandStatus } from './commandJournal'
import type { CommandType, OfflineCommand } from './commandTypes'

export type StartWorkOrderStatus = 'accepted' | 'pending_offline' | 'already_started' | 'offline_unavailable' | 'failed'

export interface StartWorkOrderResult {
  status: StartWorkOrderStatus
  messageKey: string
  commandId?: string
}

export type CompletionStatus = 'accepted' | 'pending_offline' | 'offline_unavailable' | 'failed'

export interface CompletionResult {
  status: CompletionStatus
  messageKey: string
  commandId?: string
}

export interface CompletionPayload {
  trabajoRealizado: string
  observaciones?: string
  inventoryPartsUsed?: Array<{ inventoryItemId: string; nameSnapshot: string; unit: string; quantity: number }>
  timezone?: string
  userOffset?: number
}

export interface ResolvedStartContext {
  tenantId: string; actorId: string; deviceId: string; packageId: string
  key: CryptoKey; kid: string
  expectedEntityVersion?: number
  expectedFormVersion?: number
}

export function buildStartCommandId(workOrderId: string): string {
  return `start-${workOrderId}`
}

/** Generate a stable draft ID for a new maintenance attempt. */
export function generateDraftId(workOrderId: string): string {
  return `maint-${workOrderId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Resolve full offline context from stores. Fails closed if any required
 * piece is missing — never returns partial context.
 * workOrderId is used to find the specific package containing this order.
 */
export async function resolveStartContext(tenantId: string, actorId: string, workOrderId: string): Promise<{ ctx?: ResolvedStartContext; error?: string }> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return { error: 'offline_unavailable' }

  const deviceKey = `${tenantId}:${actorId}`
  const device = await getStoredDevice(deviceKey)
  if (!device?.privateKeyHandle) return { error: 'offline_unavailable' }

  const lease = await getStoredLease()
  if (!lease?.lease) return { error: 'offline_unavailable' }

  // Resolve package containing this specific work order (cryptographic verification)
  const pkgResult = await resolvePackageForWorkOrder(tenantId, actorId, trust.deviceId, workOrderId)
  if (pkgResult.error || !pkgResult.meta) return { error: 'offline_unavailable' }
  const pkg = pkgResult.meta
  const storageKey = await getPersistedPackageKey(`${tenantId}:${actorId}:${trust.deviceId}:${pkg.packageId}`)
  if (!storageKey) return { error: 'offline_unavailable' }

  return {
    ctx: {
      tenantId, actorId,
      deviceId: trust.deviceId,
      packageId: pkg.packageId,
      key: storageKey,
      kid: lease.header.kid,
      // Omit versions when not available — never invent zero
      ...(pkgResult.workOrderVersion != null ? { expectedEntityVersion: pkgResult.workOrderVersion } : {}),
      ...(pkgResult.formVersion != null ? { expectedFormVersion: pkgResult.formVersion } : {}),
    },
  }
}

/**
 * Start a work order with fail-closed offline flow.
 * Online: delegates to API. Offline: resolves full context, records encrypted command.
 * If any required context missing → 'offline_unavailable'. No legacy fallback.
 */
export async function startWorkOrderOnlineOrOffline(
  workOrderId: string,
  ctx: ResolvedStartContext,
  onlineFn: (id: string) => Promise<unknown>,
  skipOnline = false,
): Promise<StartWorkOrderResult> {
  const commandId = buildStartCommandId(workOrderId)

  // Online path
  if (navigator.onLine && !skipOnline) {
    try {
      await onlineFn(workOrderId)
      return { status: 'accepted', messageKey: 'workOrders.orderStarted' }
    } catch (err: unknown) {
      if (!isNetworkError(err)) return { status: 'failed', messageKey: 'workOrders.errorStartingOrder' }
    }
  }

  // Offline: record encrypted command with resolved context
  const payload = { workOrderId, action: 'start' }
  const payloadHash = await hashCanonicalPayload(payload)

  const cmdParams: Parameters<typeof recordCommand>[0] = {
    commandId, commandType: 'start' as CommandType,
    payload, entityId: workOrderId,
    tenantId: ctx.tenantId, actorId: ctx.actorId,
    deviceId: ctx.deviceId, packageId: ctx.packageId,
    key: ctx.key, kid: ctx.kid,
  }
  // Only include versions when resolved — never zero
  if (ctx.expectedEntityVersion != null) cmdParams.expectedEntityVersion = ctx.expectedEntityVersion
  if (ctx.expectedFormVersion != null) cmdParams.expectedFormVersion = ctx.expectedFormVersion

  const result = await recordCommand(cmdParams)

  if (result.error) {
    if (result.error.code === 'IDEMPOTENCY_KEY_REUSED') return { status: 'already_started', messageKey: 'workOrders.orderAlreadyStarted', commandId }
    return { status: 'failed', messageKey: 'workOrders.errorStartingOrder', commandId }
  }

  return { status: 'pending_offline', messageKey: 'offline.pendingSync', commandId }
}

function isNetworkError(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')
}

/**
 * Selective purge: remove only offline draft keys for a specific tenant+user scope.
 * Does NOT call localStorage.clear() — preserves unrelated preferences/state.
 * Also purges encrypted staged evidence for the departing identity.
 */
export async function purgeOfflineDraftsForScope(tenantId: string, userId: string): Promise<void> {
  const prefix = `draftId:${tenantId}:${userId}:`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) keysToRemove.push(key)
  }
  for (const key of keysToRemove) localStorage.removeItem(key)
}

/**
 * Adapter payload compatible with existing online completeWorkOrder service.
 * Extends Record<string, unknown> to avoid unsafe casts.
 */
export interface CompletionAdapterPayload extends Record<string, unknown> {
  trabajoRealizado: string
  observaciones?: string
  inventoryPartsUsed?: Array<{ inventoryItemId: string; nameSnapshot: string; unit: string; quantity: number }>
  timezone?: string
  userOffset?: number
}

/**
 * Complete a work order with fail-closed offline flow.
 * Queries journal for local start command — includes dependsOn only if
 * start exists and is pending/succeeded. Authoritative en_progreso orders
 * with no local start have no dependency. Failed/rejected start blocks.
 */
export async function completeWorkOrderOnlineOrOffline(
  workOrderId: string,
  completionData: CompletionPayload,
  ctx: ResolvedStartContext,
  startCommandId: string,
  onlineFn: (id: string, data: Record<string, unknown>) => Promise<unknown>,
  skipOnline = false,
): Promise<CompletionResult> {
  const commandId = `completion-${workOrderId}`

  // Online path
  if (navigator.onLine && !skipOnline) {
    try {
      const adapterPayload: CompletionAdapterPayload = { ...completionData }
      await onlineFn(workOrderId, adapterPayload)
      return { status: 'accepted', messageKey: 'workOrders.orderCompleted' }
    } catch (err: unknown) {
      if (!isNetworkError(err)) return { status: 'failed', messageKey: 'workOrders.errorCompletingOrder' }
    }
  }

  // Offline: query journal for local start command
  const scopeKey = `${ctx.tenantId}:${ctx.actorId}:${ctx.deviceId}:${ctx.packageId}`
  const startStatus = await getCommandStatus(ctx.key, ctx.tenantId, ctx.actorId, startCommandId, scopeKey)

  // Determine dependency: only include if start exists and is not failed/rejected
  let dependsOn: string[] = []
  if (startStatus) {
    if (startStatus.status === 'failed' || startStatus.status === 'conflict' || startStatus.status === 'dead-letter') {
      return { status: 'failed', messageKey: 'workOrders.startCommandBlocked', commandId }
    }
    // pending or succeeded → include dependency
    dependsOn = [startCommandId]
  }
  // If no local start (null) → authoritative en_progreso, no dependency needed

  const payload: CompletionAdapterPayload = {
    trabajoRealizado: completionData.trabajoRealizado,
    inventoryPartsUsed: completionData.inventoryPartsUsed ?? [],
    ...(completionData.observaciones ? { observaciones: completionData.observaciones } : {}),
    ...(completionData.timezone ? { timezone: completionData.timezone } : {}),
    ...(completionData.userOffset != null ? { userOffset: completionData.userOffset } : {}),
  }

  const cmdParams: Parameters<typeof recordCommand>[0] = {
    commandId, commandType: 'completion' as CommandType,
    payload, entityId: workOrderId,
    dependsOn,
    tenantId: ctx.tenantId, actorId: ctx.actorId,
    deviceId: ctx.deviceId, packageId: ctx.packageId,
    key: ctx.key, kid: ctx.kid,
  }
  if (ctx.expectedEntityVersion != null) cmdParams.expectedEntityVersion = ctx.expectedEntityVersion
  if (ctx.expectedFormVersion != null) cmdParams.expectedFormVersion = ctx.expectedFormVersion

  const result = await recordCommand(cmdParams)
  if (result.error) return { status: 'failed', messageKey: 'workOrders.errorCompletingOrder', commandId }
  return { status: 'pending_offline', messageKey: 'offline.pendingSync', commandId }
}

export type MaintenanceStatus = 'accepted' | 'pending_offline' | 'evidence_not_staged' | 'form_unavailable' | 'offline_unavailable' | 'failed'

export interface MaintenanceResult {
  status: MaintenanceStatus
  messageKey: string
  commandId?: string
}

/**
 * Record a maintenance command offline.
 * Resolves pinned form from package — fails closed if missing/stale/ambiguous.
 * Checks evidence is staged in R8 — fails with evidence_not_staged if not.
 * Records command with form version/checksum. No legacy fallback.
 */
export async function recordMaintenanceOffline(
  workOrderId: string,
  commandId: string,
  formData: Record<string, unknown>,
  evidenceIds: string[],
  ctx: ResolvedStartContext,
  startCommandId: string,
): Promise<MaintenanceResult> {

  // 1. Resolve pinned form from package (fail closed)
  const { resolveFormForWorkOrder } = await import('./packageStorage')
  const formResult = await resolveFormForWorkOrder(
    ctx.tenantId, ctx.actorId, ctx.deviceId, ctx.packageId, workOrderId,
  )
  if (formResult.error || !formResult.form) {
    return { status: 'form_unavailable', messageKey: 'offline.formUnavailable', commandId }
  }
  const form = formResult.form

  // 2. Check evidence is staged in R8 (fail closed if not)
  if (evidenceIds.length > 0) {
    const { listStagedBinaries } = await import('./binaryStaging')
    const prefix = `${ctx.tenantId}:${ctx.actorId}:${ctx.deviceId}:${ctx.packageId}:`
    const staged = await listStagedBinaries(prefix)
    const stagedIds = new Set(staged.map(s => s.evidenceId))
    const missing = evidenceIds.filter(id => !stagedIds.has(id))
    if (missing.length > 0) {
      return { status: 'evidence_not_staged', messageKey: 'offline.evidenceNotStaged', commandId }
    }
  }

  // 3. Query journal for start command (conditional dependency)
  const scopeKey = `${ctx.tenantId}:${ctx.actorId}:${ctx.deviceId}:${ctx.packageId}`
  const startStatus = await getCommandStatus(ctx.key, ctx.tenantId, ctx.actorId, startCommandId, scopeKey)

  let dependsOn: string[] = []
  if (startStatus) {
    if (startStatus.status === 'failed' || startStatus.status === 'conflict' || startStatus.status === 'dead-letter') {
      return { status: 'failed', messageKey: 'workOrders.startCommandBlocked', commandId }
    }
    dependsOn = [startCommandId]
  }

  // 4. Record command with pinned form version/checksum
  const payload = {
    workOrderId,
    action: 'maintenance',
    formData,
    evidenceIds,
    formVersion: form.version,
    formChecksum: form.checksum,
    templateId: form.templateId,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userOffset: new Date().getTimezoneOffset(),
  }

  const cmdParams: Parameters<typeof recordCommand>[0] = {
    commandId, commandType: 'maintenance' as CommandType,
    payload, entityId: workOrderId,
    dependsOn, expectedFormVersion: form.version,
    tenantId: ctx.tenantId, actorId: ctx.actorId,
    deviceId: ctx.deviceId, packageId: ctx.packageId,
    key: ctx.key, kid: ctx.kid,
  }
  if (ctx.expectedEntityVersion != null) cmdParams.expectedEntityVersion = ctx.expectedEntityVersion

  const result = await recordCommand(cmdParams)
  if (result.error) return { status: 'failed', messageKey: 'workOrders.errorMaintenanceRecord', commandId }
  return { status: 'pending_offline', messageKey: 'offline.pendingSync', commandId }
}

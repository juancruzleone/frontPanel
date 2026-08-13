import { useAuthStore } from '@/store/authStore'
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredLease } from './leaseGate'
import { getPersistedPackageKey, listReadyPackages } from './packageStorage'
import { listCommands, recordCommand } from './commandJournal'
import type { OfflineCommand } from './commandTypes'

export interface ClientMaintenancePayload {
  titulo: string
  descripcion: string
  instalacionId: string
  dispositivoId?: string | null
  prioridad: 'baja' | 'media' | 'alta'
  tipoProblema: string
  fechaPreferida?: string | null
  horaPreferida?: string | null
  contactoNombre: string
  contactoTelefono: string
  contactoEmail: string
  observaciones?: string
}

export async function recordClientMaintenanceRequest(
  payload: ClientMaintenancePayload,
  commandId: string = crypto.randomUUID(),
): Promise<{ commandId?: string; error?: string }> {
  const auth = useAuthStore.getState()
  const trust = useOfflineTrustStore.getState()
  if (auth.role !== 'cliente' || !auth.tenantId || !auth.userId || !trust.deviceId || !trust.isOfflineReady) {
    return { error: 'OFFLINE_CLIENT_UNAVAILABLE' }
  }

  const packages = await listReadyPackages(auth.tenantId, auth.userId, trust.deviceId)
  const pkg = [...packages]
    .filter(item => item.manifest.role === 'cliente' && item.manifest.audience?.installationIds.includes(payload.instalacionId))
    .sort((a, b) => b.sealedAt - a.sealedAt)[0]
  if (!pkg) return { error: 'INSTALLATION_NOT_PREPARED' }

  const key = await getPersistedPackageKey(pkg.scopeKey)
  const lease = await getStoredLease()
  if (!key || !lease) return { error: 'OFFLINE_CLIENT_UNAVAILABLE' }
  if (lease.lease.tenantId !== auth.tenantId || lease.lease.userId !== auth.userId
    || lease.lease.deviceId !== trust.deviceId || lease.lease.role !== 'cliente') {
    return { error: 'OFFLINE_CLIENT_UNAVAILABLE' }
  }

  const result = await recordCommand({
    commandId,
    commandType: 'client_maintenance_request',
    payload: { ...payload, clientRequestId: commandId } as Record<string, unknown>,
    entityId: payload.instalacionId,
    entityType: 'installation',
    tenantId: auth.tenantId,
    actorId: auth.userId,
    deviceId: trust.deviceId,
    packageId: pkg.packageId,
    key,
    kid: lease.header.kid,
  })
  return result.error ? { error: result.error.code } : { commandId }
}

export async function listClientMaintenanceCommands(): Promise<OfflineCommand[]> {
  const auth = useAuthStore.getState()
  const trust = useOfflineTrustStore.getState()
  if (!auth.tenantId || !auth.userId || !trust.deviceId) return []
  const packages = await listReadyPackages(auth.tenantId, auth.userId, trust.deviceId)
  const commands: OfflineCommand[] = []
  for (const pkg of packages) {
    const key = await getPersistedPackageKey(pkg.scopeKey)
    if (!key) continue
    commands.push(...(await listCommands(key, pkg.scopeKey)).filter(item => item.commandType === 'client_maintenance_request'))
  }
  return commands
}

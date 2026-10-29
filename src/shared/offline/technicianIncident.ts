import { useAuthStore } from '../../store/authStore'
import { useOfflineTrustStore } from '../../store/offlineTrustStore'
import { getStoredLease } from './leaseGate'
import { getPersistedPackageKey, listReadyPackages } from './packageStorage'
import { listCommands, recordCommand } from './commandJournal'
import type { OfflineCommand } from './commandTypes'
import type { CreateIncidentData } from '../../features/incidents/types/incidents.types'

const PENDING_INCIDENTS_KEY = 'offline_pending_incidents'

export function getPendingIncidentsFromStorage(): (CreateIncidentData & { commandId: string; createdAt: string })[] {
  try {
    const raw = localStorage.getItem(PENDING_INCIDENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePendingIncidentsToStorage(items: (CreateIncidentData & { commandId: string; createdAt: string })[]): void {
  try {
    localStorage.setItem(PENDING_INCIDENTS_KEY, JSON.stringify(items))
  } catch {
    throw new Error('OFFLINE_STORAGE_UNAVAILABLE')
  }
}

export async function recordTechnicianIncident(
  payload: CreateIncidentData,
  commandId: string = crypto.randomUUID(),
): Promise<{ commandId?: string; error?: string }> {
  const auth = useAuthStore.getState()
  const trust = useOfflineTrustStore.getState()

  const saveLocalFallback = () => {
    try {
      const items = getPendingIncidentsFromStorage()
      const entry = { ...payload, commandId, createdAt: new Date().toISOString() }
      items.push(entry)
      savePendingIncidentsToStorage(items)
      const verify = getPendingIncidentsFromStorage()
      if (!verify.some(item => item.commandId === commandId)) {
        return { error: 'OFFLINE_INCIDENT_UNAVAILABLE' }
      }
      return { commandId }
    } catch {
      return { error: 'OFFLINE_INCIDENT_UNAVAILABLE' }
    }
  }

  if (!auth.tenantId || !auth.userId || !trust.deviceId || !trust.isOfflineReady) {
    return saveLocalFallback()
  }

  const packages = await listReadyPackages(auth.tenantId, auth.userId, trust.deviceId)
  const pkg = [...packages]
    .filter(item => (item.manifest.role === 'tecnico' || item.manifest.role === 'admin')
      && (item.manifest.audience?.installationIds.includes(payload.instalacionId) || item.manifest.audience?.workOrderIds.includes(payload.ordenPreventivaOrigenId || '')))
    .sort((a, b) => b.sealedAt - a.sealedAt)[0]

  if (!pkg) {
    return saveLocalFallback()
  }

  const key = await getPersistedPackageKey(pkg.scopeKey)
  const lease = await getStoredLease()
  if (!key || !lease) {
    return saveLocalFallback()
  }

  const result = await recordCommand({
    commandId,
    commandType: 'technician_incident_report',
    payload: { ...payload, clientRequestId: commandId } as Record<string, unknown>,
    entityId: payload.dispositivoId,
    entityType: 'device',
    tenantId: auth.tenantId,
    actorId: auth.userId,
    deviceId: trust.deviceId,
    packageId: pkg.packageId,
    key,
    kid: lease.header.kid,
  })

  return result.error ? { error: result.error.code } : { commandId }
}

export async function listTechnicianIncidentCommands(): Promise<OfflineCommand[]> {
  const auth = useAuthStore.getState()
  const trust = useOfflineTrustStore.getState()
  if (!auth.tenantId || !auth.userId || !trust.deviceId) return []
  const packages = await listReadyPackages(auth.tenantId, auth.userId, trust.deviceId)
  const commands: OfflineCommand[] = []
  for (const pkg of packages) {
    const key = await getPersistedPackageKey(pkg.scopeKey)
    if (!key) continue
    commands.push(...(await listCommands(key, pkg.scopeKey)).filter(item => item.commandType === 'technician_incident_report'))
  }
  return commands
}

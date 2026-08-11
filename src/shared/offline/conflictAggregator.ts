/**
 * Conflict aggregator — reads encrypted journal, returns sanitized DTO.
 * No payload/binding/hash/signature fields. Scoped to active identity.
 */
import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { getStoredDevice } from './deviceTrust'
import { listReadyPackages } from './packageStorage'
import { listConflictedCommands } from './commandJournal'
import type { OfflineCommand, CommandStatus, CommandType } from './commandTypes'

/** Strict safe DTO — only display-safe fields, no sensitive data. */
export interface ConflictItem {
  commandId: string
  commandType: CommandType
  status: CommandStatus
  failureCode: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Read encrypted journal for all active package scopes, decrypt commands,
 * return only conflict/dead-letter items as sanitized DTOs.
 * Never crosses identity boundaries.
 */
export async function getConflictItems(): Promise<ConflictItem[]> {
  const trust = useOfflineTrustStore.getState()
  if (!trust.isOfflineReady || !trust.deviceId) return []

  const raw = localStorage.getItem('auth-storage')
  if (!raw) return []
  let tenantId: string, actorId: string
  try {
    const { state } = JSON.parse(raw)
    tenantId = state.tenantId; actorId = state.userId
    if (!tenantId || !actorId) return []
  } catch { return [] }

  const device = await getStoredDevice(`${tenantId}:${actorId}`)
  if (!device?.privateKeyHandle) return []

  const packages = await listReadyPackages(tenantId, actorId, trust.deviceId)
  const items: ConflictItem[] = []

  for (const pkg of packages) {
    const scopeKey = `${tenantId}:${actorId}:${trust.deviceId}:${pkg.packageId}`
    try {
      const all = await listConflictedCommands(device.privateKeyHandle, scopeKey)
      for (const cmd of all) {
        items.push(sanitizeCommand(cmd))
      }
    } catch { /* skip unreadable scope */ }
  }

  return items
}

/** Extract only safe display fields from a decrypted command. */
function sanitizeCommand(cmd: OfflineCommand): ConflictItem {
  return {
    commandId: cmd.commandId,
    commandType: cmd.commandType,
    status: cmd.status,
    failureCode: cmd.failureCode ?? null,
    retryCount: cmd.retryCount ?? 0,
    createdAt: cmd.createdAt,
    updatedAt: cmd.updatedAt,
  }
}

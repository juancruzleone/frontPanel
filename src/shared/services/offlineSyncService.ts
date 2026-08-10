import { useOfflineStore, QueuedRequest, classifySyncError } from "../../store/offlineStore"
import { useWorkOrderStore } from "../../store/workOrderStore"
import { useInstallationStore } from "../../store/installationStore"
import { refreshSession } from "./authRefreshService"
import { isAuthError } from "../utils/apiHeaders"
import {
  buildScopeKey, getOrCreateDeviceId, type OfflineIdentityScope,
  type LeaseStatus, type SyncReceipt,
  DEAD_LETTER_MAX_ATTEMPTS,
} from "../offline/types"
import { 
  createWorkOrder, 
  updateWorkOrder, 
  completeWorkOrder, 
  startWorkOrder,
  deleteWorkOrder,
  updateWorkOrderStatus,
  assignTechnicianToWorkOrder,
  type WorkOrder,
} from "../../features/workOrders/services/workOrderServices"
import { 
  createInstallation, 
  updateInstallation, 
  deleteInstallation,
  addDeviceToInstallation,
  deleteDeviceFromInstallation,
} from "../../features/installations/services/installationServices"
import { type Installation } from "../../features/installations/hooks/useInstallations"
import { submitDeviceMaintenance } from "../../features/deviceForms/services/deviceFormService"
import { offlineBinaryStorage } from "./offlineBinaryStorage"
import { uploadBinary } from "./uploadService"

type QueuePayloadWithId = {
  id: string
  data?: Record<string, unknown>
}

const toQueuePayloadWithId = (payload: Record<string, unknown>): QueuePayloadWithId => ({
  id: String(payload.id || payload._id || ""),
  data: (typeof payload.data === "object" && payload.data !== null)
    ? payload.data as Record<string, unknown>
    : payload,
})

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Sync error"
}

/** Read current auth identity and build a scope for filtering. */
function getCurrentScope(): OfflineIdentityScope | null {
  try {
    const authState = window.localStorage.getItem('auth-storage')
    if (!authState) return null
    const parsed = JSON.parse(authState)
    const state = parsed.state
    if (!state?.userId || !state?.tenantId) return null
    return {
      tenantId: state.tenantId,
      userId: state.userId,
      deviceId: getOrCreateDeviceId(),
    }
  } catch {
    return null
  }
}

/**
 * R9: Derive lease status from the offline trust store.
 * Never editable — derived from signed claims.
 */
function getLeaseStatus(): LeaseStatus {
  try {
    const trustRaw = window.localStorage.getItem('offline-trust-storage')
    if (!trustRaw) return 'unknown'
    const parsed = JSON.parse(trustRaw)
    const claim = parsed?.state?.claim
    if (!claim?.expiresAt) return 'unknown'
    return new Date(claim.expiresAt).getTime() > Date.now() ? 'valid' : 'expired'
  } catch {
    return 'unknown'
  }
}

class OfflineSyncService {

  private isSyncing = false

  async initialize() {
    // Listen for connection changes
    window.addEventListener('online', () => {
      this.syncAll()
    })

    // Listen for Service Worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_SYNC') {
          this.syncAll()
        }
      })
    }

    // Subscribe to queue changes for Background Sync registration
    useOfflineStore.subscribe((state, prevState) => {
      if (state.queue.length > prevState.queue.length) {
        this.registerBackgroundSync()
      }
    })

    // Initial attempt if already online
    if (navigator.onLine) {
      this.syncAll()
    }
  }

  async syncAll() {
    if (this.isSyncing || !navigator.onLine) return
    
    this.isSyncing = true
    try {
      // Proactive session refresh before sync
      await refreshSession()
      await this.syncOfflineStore()
    } catch (error) {
      if (isAuthError(error)) {
        // Fail entire sync if refresh fails
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "SESSION_INVALIDATED" });
        }
      }
    } finally {
      this.isSyncing = false
    }
  }

  private async syncOfflineStore() {
    const allQueue = useOfflineStore.getState().queue
    if (allQueue.length === 0) return

    // R9: Check lease status — expired/revoked lease disables replay
    const leaseStatus = getLeaseStatus()
    if (leaseStatus === 'expired' || leaseStatus === 'revoked') {
      // Mark all pending items as auth-blocked
      for (const item of allQueue) {
        if (item.syncStatus !== 'dead-letter') {
          useOfflineStore.getState().updateRequest(item.id, {
            syncStatus: 'conflict',
            errorCategory: 'auth',
            lastError: `Lease ${leaseStatus} — re-authenticate online`,
          })
        }
      }
      return
    }

    // Filter to only the current scope's items
    const currentScope = getCurrentScope()
    const currentScopeKey = currentScope ? buildScopeKey(currentScope) : null

    const queue = allQueue.flatMap((item) => {
      if (item.quarantined) return []
      if (item.syncStatus === 'dead-letter') return [] // Never replay dead letters
      if (item.ownerScope) {
        return currentScopeKey && buildScopeKey(item.ownerScope) === currentScopeKey ? [item] : []
      }

      // A legacy userId is sufficient to prove ownership
      if (currentScope && item.userId === currentScope.userId) {
        const migratedItem = { ...item, ownerScope: currentScope }
        useOfflineStore.getState().updateRequest(item.id, { ownerScope: currentScope })
        return [migratedItem]
      }

      // Never replay legacy entries whose owner cannot be proven.
      useOfflineStore.getState().updateRequest(item.id, {
        quarantined: true,
        quarantineReason: 'legacy-owner-unproven',
      })
      return []
    })

    if (queue.length === 0) return

    const now = Date.now()
    const itemsToProcess = queue.filter((item) => {
      // R9: Backoff — skip items whose retry window hasn't elapsed
      if (item.backoff?.nextRetryAt && item.backoff.nextRetryAt > now) return false
      return true
    })

    for (const item of itemsToProcess) {
      // R9: Mark as processing
      useOfflineStore.getState().updateRequest(item.id, { syncStatus: 'processing' })

      try {
        const receipt = await this.processQueuedItem(item)
        // R9: Authoritative receipt — no optimistic success
        if (receipt) {
          useOfflineStore.getState().updateRequest(item.id, { receipt, syncStatus: 'pending' })
        }
        useOfflineStore.getState().removeFromQueue(item.id)
      } catch (error) {
        const category = classifySyncError(error)
        const retries = (item.retries || 0) + 1

        // R9: Dead-letter after max attempts
        if (retries >= DEAD_LETTER_MAX_ATTEMPTS) {
          useOfflineStore.getState().moveToDeadLetter(item.id, category, errorMessage(error))
          continue
        }

        // R9: Schedule backoff retry with jitter
        useOfflineStore.getState().updateRequest(item.id, {
          retries,
          lastError: errorMessage(error),
          errorCategory: category,
          syncStatus: category === 'auth' ? 'conflict' : 'pending',
        })
        // Only schedule backoff for retryable (non-auth, non-permanent) errors
        if (category !== 'auth' && category !== 'permanent') {
          useOfflineStore.getState().scheduleRetry(item.id)
        }

        // Pause if session expired (401/403)
        if (isAuthError(error)) {
          if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "SESSION_INVALIDATED" });
          }
          break
        }

        // Stop if offline
        if (!navigator.onLine) break
      }
    }
  }

  /**
   * R9: Process a queued item and return an authoritative receipt.
   * Receipts come only from the server — never fabricated locally.
   */
  private async processQueuedItem(item: QueuedRequest): Promise<SyncReceipt | null> {
    const payloadToSync = { ...item.payload }

    // 1. Handle pending binaries (photos, signatures, etc.)
    if (item.binaryRefs && item.binaryRefs.length > 0) {
      for (const ref of item.binaryRefs) {
        const blob = await offlineBinaryStorage.getBinary(ref.id)
        if (blob) {
          try {
            const remoteUrl = await uploadBinary(blob, ref.filename, ref.id)
            this.setPayloadValue(payloadToSync, ref.field, remoteUrl)
          } catch (error) {
            throw new Error(`Binary upload failed (${ref.filename}): ${errorMessage(error)}`)
          }
        }
      }
    }

    const payloadWithTime = {
      ...payloadToSync,
      fechaEjecucionOffline: typeof item.payload.fechaEjecucionOffline === "string"
        ? item.payload.fechaEjecucionOffline
        : new Date(item.timestamp).toISOString(),
      offlineSync: true,
      offlineId: item.id
    }

    switch (item.type) {
      case 'DEVICE_MAINTENANCE':
        if (item.metadata?.installationId && item.metadata?.deviceId) {
          await submitDeviceMaintenance(
            item.metadata.installationId,
            item.metadata.deviceId,
            payloadWithTime
          )
        }
        break;
      case 'CREATE_WORK_ORDER': {
        const payloadToSend = { ...payloadToSync }
        if (payloadToSend._id && (payloadToSend._id as string).startsWith('offline_')) {
          delete payloadToSend._id
        }
        const created = await createWorkOrder(payloadToSend as unknown as WorkOrder)
        if (item.payload._id && created?._id) {
          useWorkOrderStore.getState().updateWorkOrder(item.payload._id as string, created)
          useOfflineStore.getState().remapPayloadId(item.payload._id as string, created._id)
        }
        return created?._id ? { commandId: item.id, status: 'accepted', serverTimestamp: new Date().toISOString() } : null
      }
      case 'UPDATE_WORK_ORDER': {
        const updatePayload = toQueuePayloadWithId(payloadToSync)
        await updateWorkOrder(updatePayload.id, {
          ...updatePayload.data,
          fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
          offlineSync: true
        } as any)
        break
      }
      case 'COMPLETE_WORK_ORDER': {
        const completePayload = toQueuePayloadWithId(payloadToSync)
        await completeWorkOrder(completePayload.id, {
          ...completePayload.data,
          fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
          offlineSync: true
        } as any)
        break
      }
      case 'START_WORK_ORDER': {
        const startPayload = toQueuePayloadWithId(payloadToSync)
        await startWorkOrder(startPayload.id)
        break
      }
      case 'DELETE_WORK_ORDER': {
        const deletePayload = toQueuePayloadWithId(payloadToSync)
        await deleteWorkOrder(deletePayload.id)
        break
      }
      case 'UPDATE_WORK_ORDER_STATUS': {
        const statusPayload = toQueuePayloadWithId(payloadToSync)
        await updateWorkOrderStatus(
          statusPayload.id,
          payloadToSync.estado as string,
          payloadToSync.observaciones as string
        )
        break
      }
      case 'ASSIGN_WORK_ORDER_TECHNICIAN': {
        const assignPayload = toQueuePayloadWithId(payloadToSync)
        await assignTechnicianToWorkOrder(
          assignPayload.id,
          payloadToSync.technicianIds as string[]
        )
        break
      }
      case 'CREATE_INSTALLATION': {
        const payloadToSend = { ...payloadToSync }
        if (payloadToSend._id && (payloadToSend._id as string).startsWith('offline_')) {
          delete payloadToSend._id
        }
        const created = await createInstallation(payloadToSend as unknown as Installation)
        if (item.payload._id && created?._id) {
          useInstallationStore.getState().updateInstallation(item.payload._id as string, created)
          useOfflineStore.getState().remapPayloadId(item.payload._id as string, created._id)
        }
        return created?._id ? { commandId: item.id, status: 'accepted', serverTimestamp: new Date().toISOString() } : null
      }
      case 'UPDATE_INSTALLATION': {
        const instUpdatePayload = toQueuePayloadWithId(payloadToSync)
        await updateInstallation(instUpdatePayload.id, {
          ...instUpdatePayload.data,
          fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
          offlineSync: true
        } as any)
        break
      }
      case 'DELETE_INSTALLATION': {
        const instDeletePayload = toQueuePayloadWithId(payloadToSync)
        await deleteInstallation(instDeletePayload.id)
        break
      }
      case 'ADD_INSTALLATION_DEVICE': {
        if (item.metadata?.installationId) {
          await addDeviceToInstallation(item.metadata.installationId, payloadToSync)
        }
        break
      }
      case 'REMOVE_INSTALLATION_DEVICE': {
        if (item.metadata?.installationId && item.metadata?.deviceId) {
          await deleteDeviceFromInstallation(item.metadata.installationId, item.metadata.deviceId)
        }
        break
      }
    }

    // Cleanup: Remove binaries from IndexedDB after successful sync
    if (item.binaryRefs) {
      for (const ref of item.binaryRefs) {
        await offlineBinaryStorage.removeBinary(ref.id)
      }
    }

    return null
  }

  /**
   * Update a value in an object using a simple field path (supports simple arrays)
   */
  private setPayloadValue(payload: any, field: string, value: any) {
    if (field.includes('[') && field.includes(']')) {
      const [name, indexPart] = field.split('[')
      const index = parseInt(indexPart.replace(']', ''))
      if (!Array.isArray(payload[name])) {
        payload[name] = []
      }
      payload[name][index] = value
    } else {
      payload[field] = value
    }
  }

  registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        const syncRegistration = registration as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> }
        }
        syncRegistration.sync?.register('offline-sync').catch(() => {
          // Fallback if sync registration fails
        })
      })
    }
  }
}

export const offlineSyncService = new OfflineSyncService()

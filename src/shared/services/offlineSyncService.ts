import { useOfflineStore, QueuedRequest } from "../../store/offlineStore"
import { useWorkOrderStore } from "../../store/workOrderStore"
import { useInstallationStore } from "../../store/installationStore"
import { refreshSession } from "./authRefreshService"
import { isAuthError } from "../utils/apiHeaders"
import { useAuthStore } from "../../store/authStore"
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
  type InstallationUpdateDto,
} from "../../features/installations/services/installationServices"
import { type Installation } from "../../features/installations/hooks/useInstallations"
import { submitDeviceMaintenance } from "../../features/deviceForms/services/deviceFormService"
import { offlineBinaryStorage } from "./offlineBinaryStorage"
import { uploadBinary } from "./uploadService"
import { ApiError } from "./ApiError"

const MAX_RETRIES = 3
const PERMANENT_STATUSES = new Set([404, 409, 422])
const PERMANENT_CODES = new Set([
  "BINARY_NOT_FOUND",
  "BINARY_NOT_ACCEPTED",
  "VALIDATION_ERROR",
  "DUPLICATE_EVIDENCE_ID",
])

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Error de sincronización"
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (error instanceof ApiError) return error.status
  const status = (error as { status?: unknown })?.status
  return typeof status === "number" ? status : undefined
}

const getErrorCode = (error: unknown): string | undefined => {
  if (error instanceof ApiError) return error.code
  const code = (error as { code?: unknown })?.code
  if (typeof code === "string") return code
  const nested = (error as { error?: { code?: unknown } })?.error?.code
  return typeof nested === "string" ? nested : undefined
}

const isPermanentFailure = (error: unknown): boolean => {
  const status = getErrorStatus(error)
  if (status !== undefined && PERMANENT_STATUSES.has(status)) return true
  const code = getErrorCode(error)
  if (code && PERMANENT_CODES.has(code)) return true
  const message = errorMessage(error)
  if (message.includes("BINARY_NOT_FOUND") || message.includes("BINARY_NOT_ACCEPTED")) return true
  return false
}

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

class OfflineSyncService {

  private isSyncing = false
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return
    this.isInitialized = true
    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
      this.syncAll()
    })

    // Escuchar mensajes del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_SYNC') {
          this.syncAll()
        }
      })
    }

    // Suscribirse a cambios en el store para registrar Background Sync
    useOfflineStore.subscribe((state, prevState) => {
      if (state.queue.length > prevState.queue.length) {
        this.registerBackgroundSync()
      }
    })

    // Intento inicial si ya estamos online
    const { isAuthenticated, isAuthResolved, tenantId, userId } = useAuthStore.getState()
    if (navigator.onLine && isAuthResolved && isAuthenticated && tenantId && userId && useOfflineStore.getState().queue.some((item) => item.tenantId === tenantId && item.userId === userId)) {
      this.syncAll()
    }
  }

  async syncAll() {
    const { isAuthenticated, isAuthResolved, tenantId, userId } = useAuthStore.getState()
    if (
      this.isSyncing ||
      !navigator.onLine ||
      !isAuthResolved ||
      !isAuthenticated ||
      !tenantId ||
      !userId ||
      !useOfflineStore.getState().queue.some((item) => item.tenantId === tenantId && item.userId === userId)
    ) return
    
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
    const queue = useOfflineStore.getState().queue
    if (queue.length === 0) return

    const { tenantId: currentTenantId, userId: currentUserId } = useAuthStore.getState()
    if (!currentTenantId || !currentUserId) return
    const hasCurrentSession = (): boolean => {
      const authState = useAuthStore.getState()
      return Boolean(
        authState.userId === currentUserId &&
        authState.tenantId === currentTenantId &&
        authState.isAuthenticated &&
        authState.isAuthResolved
      )
    }

    // Copia local para evitar problemas con actualizaciones de estado reactivas durante el loop
    const itemsToProcess = queue.filter((item) => item.tenantId === currentTenantId && item.userId === currentUserId)

    for (const item of itemsToProcess) {
      if (!hasCurrentSession()) break

      try {
        await this.processQueuedItem(item)
        if (!hasCurrentSession()) break
        useOfflineStore.getState().removeFromQueue(item.id, currentTenantId, currentUserId)
      } catch (error) {
        if (!hasCurrentSession()) break
        const retries = (item.retries || 0) + 1
        const permanent = isPermanentFailure(error)
        const exhausted = retries >= MAX_RETRIES

        if (permanent || exhausted) {
          // Terminal: 404/409/422 or max retries — remove from queue, surface permanent error, do not loop.
          const lastError = permanent
            ? `permanent:${errorMessage(error)}`
            : `max_retries:${errorMessage(error)}`
          // Exponential backoff is capped and deferred to next sync cycle for transient failures.
          // For terminal failures we remove immediately; for exhausted transient we apply a minimal yield.
          if (!permanent) {
            const backoffMs = Math.min(1000 * Math.pow(2, Math.max(0, retries - 1)), 10000)
            if (backoffMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, 50)))
          }
          // Remove terminal item — no retry. LastError is surfaced via removal; queue entry is purged.
          // BinaryRefs remain in IndexedDB only if they were lease-bound via binaryStaging (receipt-gated cleanup).
          useOfflineStore.getState().removeFromQueue(item.id, currentTenantId, currentUserId)
          if (isAuthError(error)) {
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "SESSION_INVALIDATED" });
            }
            break
          }
          if (!navigator.onLine) break
          continue
        }

        useOfflineStore.getState().updateRequest(
          item.id,
          currentTenantId,
          currentUserId,
          { retries, lastError: errorMessage(error) },
        )
        
        // Pause if session expired (401/403)
        if (isAuthError(error)) {
          // Notify Service Worker to clear API cache
          if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "SESSION_INVALIDATED" });
          }
          break
        }

        // Si hay un error de red, paramos el proceso
        if (!navigator.onLine) break
      }
    }
  }

  private async processQueuedItem(item: QueuedRequest) {
    const payloadToSync = { ...item.payload }

    // 1. Manejar Binarios Pendientes (Fotos, firmas, etc.)
    if (item.binaryRefs && item.binaryRefs.length > 0) {
      for (const ref of item.binaryRefs) {
        const blob = await offlineBinaryStorage.getBinary(ref.id)
        if (blob) {
          try {
            const remoteUrl = await uploadBinary(blob, ref.filename, ref.id)
            this.setPayloadValue(payloadToSync, ref.field, remoteUrl)
          } catch (error) {
            // Preserve status/code for permanent-failure classification (404/409/422, BINARY_NOT_FOUND)
            const enriched = new Error(`Error al subir binario (${ref.filename}): ${errorMessage(error)}`)
            const status = getErrorStatus(error)
            const code = getErrorCode(error)
            if (status !== undefined) Object.assign(enriched, { status })
            if (code) Object.assign(enriched, { code })
            throw enriched
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
        // SAFETY: payloadToSend has been sanitized and stripped of offline _id; shape verified by offline queue schema
        const created = await createWorkOrder(payloadToSend as unknown as WorkOrder, item.id)
        if (item.payload._id && created?._id && item.tenantId && item.userId) {
          useWorkOrderStore.getState().updateWorkOrder(item.payload._id as string, created)
          useOfflineStore.getState().remapPayloadId(item.payload._id as string, created._id, item.tenantId, item.userId)
        }
        break
      }
      case 'UPDATE_WORK_ORDER': {
        const updatePayload = toQueuePayloadWithId(payloadToSync)
        await updateWorkOrder(updatePayload.id, {
          ...updatePayload.data,
          fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
          offlineSync: true
        } as any, item.id)
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
          payloadToSync.technicianIds as string[],
          item.id
        )
        break
      }
      case 'CREATE_INSTALLATION': {
        const payloadToSend = { ...payloadToSync }
        if (payloadToSend._id && (payloadToSend._id as string).startsWith('offline_')) {
          delete payloadToSend._id
        }
        // SAFETY: payload validated offline as Installation shape before queuing; _id sanitized if offline
        const created = await createInstallation(payloadToSend as unknown as Installation)
        if (item.payload._id && created?._id && item.tenantId && item.userId) {
          useInstallationStore.getState().updateInstallation(item.payload._id as string, created)
          useOfflineStore.getState().remapPayloadId(item.payload._id as string, created._id, item.tenantId, item.userId)
        }
        break
      }
      case 'UPDATE_INSTALLATION': {
        const instUpdatePayload = toQueuePayloadWithId(payloadToSync)
        // SAFETY: instUpdatePayload.data comes from queued Installation update, shape checked at enqueue
        await updateInstallation(instUpdatePayload.id, instUpdatePayload.data as unknown as InstallationUpdateDto)
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

    // Limpieza: Eliminar binarios de IndexedDB después de una sincronización exitosa
    if (item.binaryRefs) {
      for (const ref of item.binaryRefs) {
        await offlineBinaryStorage.removeBinary(ref.id)
      }
    }
  }

  /**
   * Actualiza un valor en un objeto usando una ruta simple de campo (soporta arrays simples)
   */
  private setPayloadValue(payload: any, field: string, value: any) {
    if (field.includes('[') && field.includes(']')) {
      // Manejar acceso a array como "fotosEvidencia[0]"
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
          // Fallback si falla registro de sync
        })
      })
    }
  }
}

export const offlineSyncService = new OfflineSyncService()

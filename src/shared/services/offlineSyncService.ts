import { useOfflineStore, QueuedRequest } from "../../store/offlineStore"
import { useWorkOrderStore } from "../../store/workOrderStore"
import { useInstallationStore } from "../../store/installationStore"
import { refreshSession } from "./authRefreshService"
import { isAuthError } from "../utils/apiHeaders"
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
  return "Error de sincronización"
}

class OfflineSyncService {

  private isSyncing = false

  async initialize() {
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
    const queue = useOfflineStore.getState().queue
    if (queue.length === 0) return

    // Copia local para evitar problemas con actualizaciones de estado reactivas durante el loop
    const itemsToProcess = [...queue]

    for (const item of itemsToProcess) {
      try {
        await this.processQueuedItem(item)
        useOfflineStore.getState().removeFromQueue(item.id)
      } catch (error) {
        const retries = (item.retries || 0) + 1
        useOfflineStore.getState().updateRequest(item.id, { retries, lastError: errorMessage(error) })
        
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
            const remoteUrl = await uploadBinary(blob, ref.filename)
            this.setPayloadValue(payloadToSync, ref.field, remoteUrl)
          } catch (error) {
            // Si falla la subida del binario, lanzamos error para detener la sincronización de este item
            throw new Error(`Error al subir binario (${ref.filename}): ${errorMessage(error)}`)
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
        break
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
        break
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

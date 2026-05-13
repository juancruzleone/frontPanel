import { useOfflineStore, QueuedRequest } from "../../store/offlineStore"
import { 
  createWorkOrder, 
  updateWorkOrder, 
  completeWorkOrder, 
  startWorkOrder,
  type WorkOrder,
  type WorkOrderCompletionData,
  type WorkOrderStartData,
} from "../../features/workOrders/services/workOrderServices"
import { 
  createInstallation, 
  updateInstallation, 
  deleteInstallation 
} from "../../features/installations/services/installationServices"
import { submitDeviceMaintenance } from "../../features/deviceForms/services/deviceFormService"

type QueuePayloadWithId = {
  id: string
  data?: Record<string, unknown>
}

type PendingMaintenanceSubmission = {
  id: string
  installationId: string
  deviceId: string
  formData: Record<string, unknown>
  timestamp: number
  retryCount?: number
}

const toQueuePayloadWithId = (payload: Record<string, unknown>): QueuePayloadWithId => ({
  id: String(payload.id || ""),
  data: typeof payload.data === "object" && payload.data !== null
    ? payload.data as Record<string, unknown>
    : {},
})

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Error de sincronización"

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
      await this.syncOfflineStore()
      await this.syncDeviceForms()
    } catch (error) {
      // Error general de sincronización
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
        // Si hay un error de red, paramos el proceso
        if (!navigator.onLine) break
      }
    }
  }

  private async processQueuedItem(item: QueuedRequest) {
    const payloadWithTime = {
      ...item.payload,
      fechaEjecucionOffline: new Date(item.timestamp).toISOString(),
      offlineSync: true
    }

    switch (item.type) {
      case 'CREATE_WORK_ORDER':
        const created = await createWorkOrder(payloadWithTime as WorkOrder)
        // Si el payload tenía un ID temporal, necesitamos mapear el ID real en el resto de la cola
        if (item.payload._id && created._id) {
            useOfflineStore.getState().remapPayloadId(item.payload._id as string, created._id)
        }
        break
      case 'UPDATE_WORK_ORDER':
        const updatePayload = toQueuePayloadWithId(item.payload)
        await updateWorkOrder(updatePayload.id, {
            ...updatePayload.data,
            fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
            offlineSync: true
        } as WorkOrder)
        break
      case 'COMPLETE_WORK_ORDER':
        const completePayload = toQueuePayloadWithId(item.payload)
        await completeWorkOrder(completePayload.id, {
            ...completePayload.data,
            fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
            offlineSync: true
        } as WorkOrderCompletionData)
        break
      case 'START_WORK_ORDER':
        const startPayload = toQueuePayloadWithId(item.payload)
        await startWorkOrder(startPayload.id, {
          ...startPayload.data,
          fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
          offlineSync: true,
        } as WorkOrderStartData)
        break
      case 'CREATE_INSTALLATION':
        await createInstallation(payloadWithTime)
        break
      case 'UPDATE_INSTALLATION':
        const instUpdatePayload = toQueuePayloadWithId(item.payload)
        await updateInstallation(instUpdatePayload.id, {
            ...instUpdatePayload.data,
            fechaEjecucionOffline: payloadWithTime.fechaEjecucionOffline,
            offlineSync: true
        })
        break
      case 'DELETE_INSTALLATION':
        const instDeletePayload = toQueuePayloadWithId(item.payload)
        await deleteInstallation(instDeletePayload.id)
        break
    }
  }

  private async syncDeviceForms() {
    const stored = localStorage.getItem('pendingMaintenanceSubmissions')
    if (!stored) return

    let submissions: PendingMaintenanceSubmission[] = []
    try {
      submissions = JSON.parse(stored)
    } catch {
      return
    }

    if (submissions.length === 0) return

    const remainingSubmissions: PendingMaintenanceSubmission[] = []

    for (const sub of submissions) {
      try {
        const payloadWithTime = {
          ...sub.formData,
          fechaEjecucionOffline: new Date(sub.timestamp).toISOString(),
          offlineSync: true
        }
        await submitDeviceMaintenance(sub.installationId, sub.deviceId, payloadWithTime)
      } catch (error) {
        const retryCount = (sub.retryCount || 0) + 1
        if (navigator.onLine) {
          remainingSubmissions.push({ ...sub, retryCount })
        }
        if (!navigator.onLine) {
            // Si perdimos conexión, guardamos el resto sin procesar
            const idx = submissions.indexOf(sub)
            remainingSubmissions.push(...submissions.slice(idx))
            break
        }
      }
    }

    localStorage.setItem('pendingMaintenanceSubmissions', JSON.stringify(remainingSubmissions))
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

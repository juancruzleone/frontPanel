import { useCallback, useEffect, useRef } from 'react'
import { useOfflineStore } from '../../store/offlineStore'
import { useAuthStore } from '../../store/authStore'
import { useWorkOrderStore } from '../../store/workOrderStore'
import { useInstallationStore } from '../../store/installationStore'
import { WorkOrder } from '../../features/workOrders/hooks/useWorkOrders'
import { Installation } from '../../features/installations/hooks/useInstallations'
import { 
  createWorkOrder, 
  updateWorkOrder, 
  completeWorkOrder, 
  startWorkOrder 
} from '../../features/workOrders/services/workOrderServices'
import {
  createInstallation,
  updateInstallation,
  deleteInstallation
} from '../../features/installations/services/installationServices'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

const SYNC_LOCK_KEY = 'sync_lock_timestamp'
const LOCK_TIMEOUT_MS = 10000
const MAX_RETRIES = 3

export const OfflineSyncManager = () => {
  const removeFromQueue = useOfflineStore(state => state.removeFromQueue)
  const updateRequest = useOfflineStore(state => state.updateRequest)
  const remapPayloadId = useOfflineStore(state => state.remapPayloadId)
  const queueLength = useOfflineStore(state => state.queue.length)
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const { t } = useTranslation()
  const isSyncing = useRef(false)
  const retryTimeoutRef = useRef<number | null>(null)
  const syncQueueRef = useRef<() => Promise<void>>(async () => {})

  const performSync = useCallback(async () => {
    isSyncing.current = true
    let hasTransientError = false
    
    const currentUserIdForToast = useAuthStore.getState().userId
    const hasMyItemsForToast = useOfflineStore.getState().queue.some(r => r.userId === currentUserIdForToast)
    
    // Notify only once per sync session if there are items
    if (hasMyItemsForToast) {
      toast.info(t('common.syncing', { defaultValue: 'Sincronizando cambios pendientes...' }))
    }

    try {
      while (useOfflineStore.getState().queue.length > 0) {
        if (!navigator.locks) {
          // Renovar lock fallback
          localStorage.setItem(SYNC_LOCK_KEY, Date.now().toString())
        }
        
        const currentUserId = useAuthStore.getState().userId
        
        // Find the first item in the queue that belongs to the current user
        const queue = useOfflineStore.getState().queue
        const request = queue.find(req => req.userId === currentUserId)
        
        if (!request) {
          // No items for the current user, break
          break
        }
        
        try {
          let realId;
          switch (request.type) {
            case 'CREATE_WORK_ORDER': {
              const payloadToSend = { ...request.payload }
              if (payloadToSend._id && (payloadToSend._id as string).startsWith('offline_')) {
                delete payloadToSend._id
                delete payloadToSend.id
              }
              const createdWO = await createWorkOrder(payloadToSend as unknown as WorkOrder)
              realId = createdWO?._id || (createdWO as unknown as { id?: string })?.id
              if (realId && request.payload._id) {
                // Update local store with new real ID
                useWorkOrderStore.getState().updateWorkOrder(request.payload._id as string, createdWO)
                // Remap any dependent queue items
                remapPayloadId(request.payload._id as string, realId)
              }
              break
            }
            case 'UPDATE_WORK_ORDER':
              await updateWorkOrder(request.payload.id as string, request.payload.data as WorkOrder)
              break
            case 'COMPLETE_WORK_ORDER':
              await completeWorkOrder(request.payload.id as string, request.payload.data as Record<string, unknown>)
              break
            case 'START_WORK_ORDER':
              await startWorkOrder(request.payload.id as string)
              break
            case 'CREATE_INSTALLATION': {
              const payloadToSend = { ...request.payload }
              if (payloadToSend._id && (payloadToSend._id as string).startsWith('offline_')) {
                delete payloadToSend._id
                delete payloadToSend.id
              }
              const createdInst = await createInstallation(payloadToSend as unknown as Installation)
              realId = createdInst?._id || (createdInst as { id?: string })?.id
              if (realId && request.payload._id) {
                useInstallationStore.getState().updateInstallation(request.payload._id as string, createdInst)
                remapPayloadId(request.payload._id as string, realId)
              }
              break
            }
            case 'UPDATE_INSTALLATION':
              await updateInstallation(request.payload.id as string, request.payload.data as Partial<Installation>)
              break
            case 'DELETE_INSTALLATION':
              await deleteInstallation(request.payload.id as string)
              break
          }
          removeFromQueue(request.id)
        } catch (error: unknown) {
          const err = error as Error;
          let httpStatus: number | undefined;

          if (typeof error === 'object' && error !== null) {
            const errObj = error as Record<string, unknown>;
            if (typeof errObj.status === 'number') {
              httpStatus = errObj.status;
            } else if (typeof errObj.response === 'object' && errObj.response !== null) {
              const resp = errObj.response as Record<string, unknown>;
              if (typeof resp.status === 'number') {
                httpStatus = resp.status;
              }
            }
          }
          
          let isClientError = false
          let isServerError = false
          
          if (httpStatus && httpStatus >= 400 && httpStatus < 500) isClientError = true
          if (httpStatus && httpStatus >= 500) isServerError = true
          
          // Fallback parsing of generic Error message if status is not attached
          const errMsg = err.message?.toLowerCase() || ''
          const isNetworkError = !navigator.onLine || errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('failed to fetch')
          
          if (!isClientError && !isServerError && !isNetworkError) {
             if (errMsg.includes('400') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('404') || errMsg.includes('422')) isClientError = true
             if (errMsg.includes('500') || errMsg.includes('502') || errMsg.includes('503') || errMsg.includes('504')) isServerError = true
          }
          
          if (isNetworkError || isServerError) {
            hasTransientError = true
            const retries = request.retries || 0
            updateRequest(request.id, { retries: retries + 1 })
            break // Stop loop to preserve order or retry later
          }
          
          // If it's a client error or something we couldn't identify but failed MAX_RETRIES times
          if (isClientError) {
            // Poison pill, remove it immediately
            removeFromQueue(request.id)
            toast.error(t('common.syncValidationDiscarded', {
              type: request.type,
              defaultValue: 'Error de validación ({{type}}). Descartado.'
            }))
            continue // go to next item
          } else {
            // Unknown error, try a few times then drop
            const retries = (request.retries || 0) + 1
            if (retries >= MAX_RETRIES) {
              removeFromQueue(request.id)
               toast.error(t('common.syncElementDiscarded', {
                 type: request.type,
                 defaultValue: 'Error sincronizando elemento ({{type}}). Descartado.'
               }))
              continue
            } else {
              updateRequest(request.id, { retries })
              hasTransientError = true
              break // wait for next sync cycle
            }
          }
        }
      }
    } finally {
      isSyncing.current = false
      if (hasTransientError && navigator.onLine) {
        // Find the request that caused the error (first of this user)
        const currentUserId = useAuthStore.getState().userId
        const req = useOfflineStore.getState().queue.find(r => r.userId === currentUserId)
        const retries = req?.retries || 0
        const backoff = Math.min(1000 * Math.pow(2, retries), 30000) // max 30s
        
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current)
        }
        retryTimeoutRef.current = window.setTimeout(() => {
          void syncQueueRef.current()
        }, backoff)
      } else if (!hasTransientError && !useOfflineStore.getState().queue.some(r => r.userId === currentUserIdForToast)) {
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
        if (hasMyItemsForToast) {
          toast.success(t('common.syncComplete', { defaultValue: 'Sincronización completada' }))
        }
      }
    }
  }, [remapPayloadId, removeFromQueue, t, updateRequest])

  const syncQueue = useCallback(async () => {
    if (isSyncing.current || !isAuthenticated || useOfflineStore.getState().queue.length === 0 || !navigator.onLine) return

    // Attempt to use Web Locks API if available
    if (navigator.locks) {
      navigator.locks.request('offline-sync', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          // Locked by another tab
          return
        }
        await performSync()
      })
    } else {
      // Fallback to localStorage lock with expiry
      const now = Date.now()
      const lock = localStorage.getItem(SYNC_LOCK_KEY)
      if (lock && now - parseInt(lock, 10) < LOCK_TIMEOUT_MS) {
        // Locked by another tab recently
        return
      }
      localStorage.setItem(SYNC_LOCK_KEY, now.toString())
      await performSync()
    }
  }, [isAuthenticated, performSync])

  useEffect(() => {
    syncQueueRef.current = syncQueue
  }, [syncQueue])

  useEffect(() => {
    const handleOnline = () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      syncQueue()
    }

    window.addEventListener('online', handleOnline)
    // También intentar sincronizar al montar o cuando auth cambie si ya estamos online
    if (navigator.onLine && isAuthenticated) {
      syncQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [isAuthenticated, syncQueue]) // re-run if auth or translations change

  useEffect(() => {
    const queueRef = useOfflineStore.getState().queue
    const authRef = useAuthStore.getState()
    const currentUserId = authRef.userId
    const hasMyItems = queueRef.some(r => r.userId === currentUserId)
    if (navigator.onLine && authRef.isAuthenticated && hasMyItems && !isSyncing.current) {
      syncQueue()
    }
  }, [isAuthenticated, syncQueue, queueLength])

  return null
}

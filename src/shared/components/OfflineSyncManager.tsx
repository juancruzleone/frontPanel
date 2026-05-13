import { useCallback, useEffect, useRef } from 'react'
import { useOfflineStore } from '../../store/offlineStore'
import { useAuthStore } from '../../store/authStore'
import { offlineSyncService } from '../services/offlineSyncService'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export const OfflineSyncManager = () => {
  const queueLength = useOfflineStore(state => state.queue.length)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const { t } = useTranslation()
  const lastQueueLength = useRef(queueLength)
  const isSyncing = useRef(false)

  const sync = useCallback(async () => {
    if (isSyncing.current || !isAuthenticated || queueLength === 0 || !navigator.onLine) return

    isSyncing.current = true
    const currentUserId = useAuthStore.getState().userId
    const hasMyItems = useOfflineStore.getState().queue.some(r => r.userId === currentUserId)

    if (hasMyItems) {
      toast.info(t('common.syncing', { defaultValue: 'Sincronizando cambios pendientes...' }))
    }

    try {
      await offlineSyncService.syncAll()
      
      const newQueueLength = useOfflineStore.getState().queue.length
      const stillHasMyItems = useOfflineStore.getState().queue.some(r => r.userId === currentUserId)
      
      if (!stillHasMyItems && hasMyItems) {
        toast.success(t('common.syncComplete', { defaultValue: 'Sincronización completada' }))
      } else if (newQueueLength < queueLength) {
        // Some items were synced but not all
      }
    } catch (error) {
      // Error already handled in service
    } finally {
      isSyncing.current = false
    }
  }, [isAuthenticated, queueLength, t])

  useEffect(() => {
    const handleOnline = () => {
      sync()
    }

    window.addEventListener('online', handleOnline)
    
    // Escuchar mensajes del Service Worker (TRIGGER_SYNC)
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        sync()
      }
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    if (navigator.onLine && isAuthenticated && queueLength > 0) {
      sync()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [isAuthenticated, sync, queueLength])

  useEffect(() => {
    if (queueLength > lastQueueLength.current && navigator.onLine) {
      sync()
    }
    lastQueueLength.current = queueLength
  }, [queueLength, sync])

  return null
}
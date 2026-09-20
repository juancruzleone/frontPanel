/**
 * Offline sync manager — real coordinator + conflict detail dialog.
 * Sanitized progress. Reconnect dedup. No legacy stubs.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw, WifiOff, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useOfflineTrustStore } from '../../store/offlineTrustStore'
import { useOfflineStore } from '../../store/offlineStore'
import { OfflineConflictDetail } from './OfflineConflictDetail'
import { offlineSyncService } from '../services/offlineSyncService'
import styles from './OfflineSyncManager.module.css'
import type { SyncProgress } from '../offline/syncCoordinator'
import type { ConflictItem } from '../offline/conflictAggregator'

const INITIAL: SyncProgress = {
  phase: 'idle', packages: [], totalPending: 0,
  totalConflicted: 0, totalDeadLettered: 0, lastSyncAt: null,
}

const DISMISSED_NOTIFICATION_KEY = 'offline-sync-dismissed'

const readDismissedFingerprint = (storageKey: string): string | null => {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

const storeDismissedFingerprint = (storageKey: string, fingerprint: string | null) => {
  try {
    if (fingerprint === null) localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, fingerprint)
  } catch {
    // The in-memory dismissal still works when storage is unavailable.
  }
}

export const OfflineSyncManager = () => {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isAuthResolved = useAuthStore(s => s.isAuthResolved)
  const userId = useAuthStore(s => s.userId)
  const isOfflineReady = useOfflineTrustStore(s => s.isOfflineReady)
  const leaseStatus = useOfflineTrustStore(s => s.leaseStatus)
  const deviceId = useOfflineTrustStore(s => s.deviceId)
  const legacyPendingCount = useOfflineStore(s => s.queue.filter(item => item.userId === userId).length)
  const dismissalStorageKey = `${DISMISSED_NOTIFICATION_KEY}:${userId ?? 'anonymous'}:${deviceId ?? 'no-device'}`

  const [progress, setProgress] = useState<SyncProgress>(INITIAL)
  const [conflictItems, setConflictItems] = useState<ConflictItem[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null)
  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(() => readDismissedFingerprint(dismissalStorageKey))
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const cycleRunning = useRef(false)
  const mountedRef = useRef(true)

  const runCycle = useCallback(async () => {
    if (cycleRunning.current || !isAuthResolved || !isAuthenticated || !navigator.onLine) return
    if (!isOfflineReady || leaseStatus === 'expired' || leaseStatus === 'revoked') {
      if (mountedRef.current) setProgress(prev => ({ ...prev, phase: 'paused', pauseReason: 'offline.leaseInvalid' }))
      return
    }
    cycleRunning.current = true
    try {
      const { resolveSyncContext, runSyncCycle } = await import('../offline/syncCoordinator')
      const { ctx, error } = await resolveSyncContext()
      if (!ctx) {
        if (mountedRef.current) setProgress(prev => ({ ...prev, phase: 'paused', pauseReason: error }))
        return
      }
      const result = await runSyncCycle(ctx, (p) => { if (mountedRef.current) setProgress({ ...p }) })
      if (mountedRef.current) setProgress(result)
      // Refresh conflict items after sync
      const { getConflictItems } = await import('../offline/conflictAggregator')
      const items = await getConflictItems()
      if (mountedRef.current) setConflictItems(items)
    } catch {
      if (mountedRef.current) setProgress(prev => ({ ...prev, phase: 'paused', pauseReason: 'offline.syncError' }))
    } finally { cycleRunning.current = false }
  }, [isAuthResolved, isAuthenticated, isOfflineReady, leaseStatus])

  useEffect(() => {
    if (!isAuthResolved || !isAuthenticated) return
    mountedRef.current = true
    offlineSyncService.initialize()
    offlineSyncService.syncAll()
    const handleOnline = () => { setIsOnline(true); runCycle() }
    const handleOffline = () => { setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) runCycle()
    return () => {
      mountedRef.current = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isAuthResolved, isAuthenticated, runCycle])

  useEffect(() => {
    setDismissedFingerprint(readDismissedFingerprint(dismissalStorageKey))
  }, [dismissalStorageKey])

  const handleRetry = useCallback(() => { if (!cycleRunning.current) runCycle() }, [runCycle])

  const handleConflictClick = useCallback(async () => {
    if (conflictItems.length > 0) {
      setSelectedConflict(conflictItems[0])
      return
    }
    // Load conflicts from journal
    try {
      const { getConflictItems } = await import('../offline/conflictAggregator')
      const items = await getConflictItems()
      if (mountedRef.current) {
        setConflictItems(items)
        if (items.length > 0) setSelectedConflict(items[0])
      }
    } catch { /* ignore */ }
  }, [conflictItems])

  const handleRetryConflict = useCallback(() => {
    // Trigger a scoped sync cycle which will replay this command
    setSelectedConflict(null)
    if (!cycleRunning.current) runCycle()
  }, [runCycle])

  const hasRecoveryItems = progress.totalConflicted > 0 || progress.totalDeadLettered > 0
  const hasPendingPackageWork = progress.packages.some(pkg => pkg.commandsRetryable > 0 || pkg.evidenceFailed > 0)
  const hasPendingItems = legacyPendingCount > 0 || progress.totalPending > 0 || hasPendingPackageWork || hasRecoveryItems
  const shouldNotify = !isOnline || hasPendingItems
  const notificationFingerprint = [
    !isOnline ? 'offline' : hasRecoveryItems ? 'issue' : 'pending',
    hasPendingItems ? 'with-pending' : 'empty',
    progress.totalConflicted,
    progress.totalDeadLettered,
  ].join(':')
  const showNotification = shouldNotify && dismissedFingerprint !== notificationFingerprint

  useEffect(() => {
    if (shouldNotify || dismissedFingerprint === null) return
    setDismissedFingerprint(null)
    storeDismissedFingerprint(dismissalStorageKey, null)
  }, [dismissalStorageKey, dismissedFingerprint, shouldNotify])

  if (!isAuthResolved || !isAuthenticated) return null

  const statusKind = !isOnline
    ? 'paused'
    : hasRecoveryItems
      ? 'issue'
      : 'syncing'
  const titleKey = statusKind === 'paused'
    ? 'offline.connectionOffline'
    : statusKind === 'issue'
      ? 'offline.syncAttentionRequired'
      : 'offline.pendingChanges'
  const descriptionKey = statusKind === 'paused'
    ? hasPendingItems ? 'offline.offlineWithPendingDescription' : 'offline.offlineDescription'
    : statusKind === 'issue'
      ? 'offline.syncIssuesDescription'
      : 'offline.pendingChangesDescription'
  const StatusIcon = statusKind === 'paused'
    ? WifiOff
    : statusKind === 'issue'
      ? AlertTriangle
      : RefreshCw
  const canSyncNow = isOnline && isOfflineReady && leaseStatus !== 'expired' && leaseStatus !== 'revoked'

  return (
    <>
      {showNotification && (
        <div
          role="status"
          aria-live="polite"
          aria-label={t('offline.syncStatus')}
          className={`${styles.notice} ${styles[statusKind]}`}
          data-offline-sync-notification
        >
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => {
              setDismissedFingerprint(notificationFingerprint)
              storeDismissedFingerprint(dismissalStorageKey, notificationFingerprint)
            }}
            aria-label={t('offline.closeNotification')}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className={styles.icon} aria-hidden="true">
            <StatusIcon size={22} className={statusKind === 'syncing' ? styles.syncingIcon : undefined} />
          </div>
          <div className={styles.content}>
            <h2 className={styles.title}>{t(titleKey)}</h2>
            <p className={styles.description}>{t(descriptionKey)}</p>
            {(canSyncNow || hasRecoveryItems) && (
              <div className={styles.actions}>
                {canSyncNow && (
                  <button onClick={handleRetry} className={`${styles.actionButton} ${styles.retryButton}`} aria-label={t('offline.syncNow')}>
                    {t('offline.syncNow')}
                  </button>
                )}
                {progress.totalConflicted > 0 && (
                  <button onClick={handleConflictClick} className={`${styles.actionButton} ${styles.issueButton}`} aria-label={t('offline.viewConflicts')}>
                    {t('offline.conflicts', { count: progress.totalConflicted })}
                  </button>
                )}
                {progress.totalDeadLettered > 0 && (
                  <button onClick={handleConflictClick} className={`${styles.actionButton} ${styles.issueButton}`} aria-label={t('offline.viewDeadLetters')}>
                    {t('offline.deadLetters', { count: progress.totalDeadLettered })}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <OfflineConflictDetail
        item={selectedConflict}
        onClose={() => setSelectedConflict(null)}
        onRetry={handleRetryConflict}
      />
    </>
  )
}

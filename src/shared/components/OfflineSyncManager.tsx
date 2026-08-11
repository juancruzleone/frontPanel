/**
 * Offline sync manager — real coordinator + conflict detail dialog.
 * Sanitized progress. Reconnect dedup. No legacy stubs.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useOfflineTrustStore } from '../../store/offlineTrustStore'
import { OfflineConflictDetail } from './OfflineConflictDetail'
import { offlineSyncService } from '../services/offlineSyncService'
import styles from './OfflineSyncManager.module.css'
import type { SyncProgress } from '../offline/syncCoordinator'
import type { ConflictItem } from '../offline/conflictAggregator'

const INITIAL: SyncProgress = {
  phase: 'idle', packages: [], totalPending: 0,
  totalConflicted: 0, totalDeadLettered: 0, lastSyncAt: null,
}

export const OfflineSyncManager = () => {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const isAuthResolved = useAuthStore(s => s.isAuthResolved)
  const isOfflineReady = useOfflineTrustStore(s => s.isOfflineReady)
  const leaseStatus = useOfflineTrustStore(s => s.leaseStatus)

  const [progress, setProgress] = useState<SyncProgress>(INITIAL)
  const [conflictItems, setConflictItems] = useState<ConflictItem[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null)
  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(null)
  const cycleRunning = useRef(false)
  const mountedRef = useRef(true)

  const isPaused = !isOfflineReady || leaseStatus === 'expired' || leaseStatus === 'revoked'
  const pauseReason = !isOfflineReady ? 'offline.offlineUnavailable'
    : leaseStatus === 'expired' ? 'offline.leaseExpired'
    : leaseStatus === 'revoked' ? 'offline.leaseRevoked'
    : undefined
  const effectivePhase = isPaused ? 'paused' : progress.phase
  const effectivePauseReason = isPaused ? pauseReason : progress.pauseReason

  const runCycle = useCallback(async () => {
    if (cycleRunning.current || !isAuthResolved || !isAuthenticated || !navigator.onLine) return
    setDismissedFingerprint(null)
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
    offlineSyncService.initialize()
    offlineSyncService.syncAll()
    const handleOnline = () => { runCycle() }
    window.addEventListener('online', handleOnline)
    if (navigator.onLine) runCycle()
    return () => { mountedRef.current = false; window.removeEventListener('online', handleOnline) }
  }, [isAuthResolved, isAuthenticated, runCycle])

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
  const hasIssues = hasRecoveryItems || effectivePhase === 'paused'
  const notificationFingerprint = [
    effectivePhase,
    effectivePauseReason ?? '',
    progress.totalConflicted,
    progress.totalDeadLettered,
  ].join(':')
  const showNotification = (effectivePhase !== 'idle' || hasIssues) && dismissedFingerprint !== notificationFingerprint

  const statusKind = effectivePhase === 'paused'
    ? 'paused'
    : hasRecoveryItems
      ? 'issue'
      : effectivePhase === 'complete'
        ? 'complete'
        : 'syncing'
  const titleKey = statusKind === 'paused'
    ? 'offline.syncPaused'
    : statusKind === 'issue'
      ? 'offline.syncAttentionRequired'
      : statusKind === 'complete'
        ? 'offline.syncComplete'
        : 'offline.syncInProgress'
  const descriptionKey = statusKind === 'paused'
    ? effectivePauseReason?.startsWith('offline.') ? effectivePauseReason : 'offline.syncError'
    : statusKind === 'issue'
      ? 'offline.syncIssuesDescription'
      : statusKind === 'complete'
        ? 'offline.syncCompleteDescription'
        : 'offline.syncInProgressDescription'
  const StatusIcon = statusKind === 'paused'
    ? WifiOff
    : statusKind === 'issue'
      ? AlertTriangle
      : statusKind === 'complete'
        ? CheckCircle2
        : RefreshCw

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
            onClick={() => setDismissedFingerprint(notificationFingerprint)}
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
            {hasIssues && (
              <div className={styles.actions}>
                <button onClick={handleRetry} className={`${styles.actionButton} ${styles.retryButton}`} aria-label={t('offline.retry')}>
                  {t('offline.retry')}
                </button>
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

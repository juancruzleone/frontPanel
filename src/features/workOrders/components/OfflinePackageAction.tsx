/**
 * Per-order "prepare offline" action button.
 * Available for all non-terminal assigned orders: asignada, pendiente, en_progreso.
 * Self-contained: reads trust state, calls downloadPackage, shows status.
 */
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useOfflineTrustStore } from '../../../store/offlineTrustStore'
import { useAuthStore } from '../../../store/authStore'
import { downloadPackage } from '../../../shared/offline/packageDownload'
import { listReadyPackages } from '../../../shared/offline/packageStorage'
import Tooltip from '../../../shared/components/Tooltip/Tooltip'
import styles from '../styles/workOrders.module.css'

type PackageState = 'idle' | 'downloading' | 'ready' | 'incomplete' | 'error'

const NON_TERMINAL_STATES = new Set(['asignada', 'pendiente', 'en_progreso'])

interface OfflinePackageActionProps {
  orderId: string
  orderStatus: string
}

export const OfflinePackageAction = ({ orderId, orderStatus }: OfflinePackageActionProps) => {
  const { t } = useTranslation()
  const isOfflineReady = useOfflineTrustStore(s => s.isOfflineReady)
  const leaseStatus = useOfflineTrustStore(s => s.leaseStatus)
  const [state, setState] = useState<PackageState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Check if package already downloaded
  useEffect(() => {
    if (!isOfflineReady || !NON_TERMINAL_STATES.has(orderStatus)) return
    let cancelled = false
    const check = async () => {
      try {
        const auth = useAuthStore.getState()
        const trust = useOfflineTrustStore.getState()
        if (!auth.tenantId || !auth.userId || !trust.deviceId) return
        const packages = await listReadyPackages(auth.tenantId, auth.userId, trust.deviceId)
        const found = packages.some(p => p.manifest.audience?.workOrderIds?.includes(orderId))
        if (!cancelled && found) setState('ready')
      } catch { /* ignore */ }
    }
    check()
    return () => { cancelled = true }
  }, [isOfflineReady, orderStatus, orderId])

  const handlePrepare = useCallback(async () => {
    if (state === 'downloading') return
    setState('downloading')
    setErrorMsg(null)
    try {
      const result = await downloadPackage(orderId)
      if (result.status === 'success') setState('ready')
      else if (result.status === 'not_ready') { setState('incomplete'); setErrorMsg(result.missingForms?.join(', ') ?? result.error ?? null) }
      else { setState('error'); setErrorMsg(result.error ?? null) }
    } catch { setState('error'); setErrorMsg(t('offline.downloadError', { defaultValue: 'Download failed' })) }
  }, [orderId, state, t])

  // Hide for terminal, cancelled, reassigned, or unauthorized orders
  if (!NON_TERMINAL_STATES.has(orderStatus) || !isOfflineReady) return null

  const canPrepare = leaseStatus === 'valid' && navigator.onLine && state === 'idle'
  const isBusy = state === 'downloading'

  const tooltipText = state === 'ready'
    ? t('offline.packageReady', { defaultValue: 'Package ready' })
    : state === 'downloading'
    ? t('offline.downloading', { defaultValue: 'Downloading...' })
    : state === 'incomplete'
    ? t('offline.packageIncomplete', { defaultValue: 'Package incomplete' })
    : state === 'error'
    ? (errorMsg || t('offline.downloadError', { defaultValue: 'Download error' }))
    : t('offline.prepareOffline', { defaultValue: 'Prepare offline' })

  return (
    <Tooltip content={tooltipText}>
      <button
        className={styles.iconButton}
        onClick={handlePrepare}
        disabled={!canPrepare || isBusy}
        aria-label={tooltipText}
        aria-busy={isBusy}
        data-state={state}
      >
        {isBusy ? <Loader2 size={16} className="animate-spin" />
          : state === 'ready' ? <CheckCircle size={16} className="text-green-500" />
          : state === 'error' || state === 'incomplete' ? <AlertCircle size={16} className="text-yellow-500" />
          : <Download size={16} />}
      </button>
    </Tooltip>
  )
}

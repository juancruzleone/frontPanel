/**
 * Conflict/dead-letter recovery detail dialog.
 * Shows ONLY sanitized fields: command type, error category, timestamps,
 * retry eligibility. Never shows payload, IDs, signatures, hashes.
 * Preserves completion/maintenance intents. Retry through real journal.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, RefreshCw, AlertTriangle, Ban, Clock } from 'lucide-react'
import type { OfflineCommand, CommandStatus } from '../offline/commandTypes'

type ConflictItem = Pick<OfflineCommand,
  'commandId' | 'commandType' | 'status' | 'failureCode' | 'failureReason' | 'retryCount' | 'createdAt' | 'updatedAt'
>

interface OfflineConflictDetailProps {
  item: ConflictItem | null
  onClose: () => void
  onRetry?: (commandId: string) => void
}

const RETRYABLE_STATUSES = new Set<CommandStatus>(['failed', 'conflict'])
const NON_DISCARDABLE_CODES = new Set([
  'INSUFFICIENT_STOCK', 'REASSIGNED', 'STALE_ENTITY', 'STALE_FORM', 'WORK_ORDER_TERMINAL',
])

const ERROR_CATEGORY_LABELS: Record<string, string> = {
  DEPENDENCY_NOT_MET: 'offline.depNotMet',
  DEPENDENCY_FAILED: 'offline.depFailed',
  INSUFFICIENT_STOCK: 'offline.insufficientStock',
  REASSIGNED: 'offline.reassigned',
  STALE_ENTITY: 'offline.staleEntity',
  STALE_FORM: 'offline.staleForm',
  INVALID_TRANSITION: 'offline.invalidTransition',
  WORK_ORDER_TERMINAL: 'offline.workOrderTerminal',
  PAYLOAD_INTEGRITY: 'offline.payloadIntegrity',
  DEVICE_NOT_REGISTERED: 'offline.deviceNotRegistered',
  DEVICE_REVOKED: 'offline.deviceRevoked',
  LEASE_EXPIRED: 'offline.leaseExpired',
  IDEMPOTENCY_KEY_REUSED: 'offline.idempotencyReuse',
}

export const OfflineConflictDetail = ({ item, onClose, onRetry }: OfflineConflictDetailProps) => {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [retrying, setRetrying] = useState(false)

  // Derived values (computed before early return to keep hook order stable)
  const canRetry = item ? RETRYABLE_STATUSES.has(item.status) && (item.retryCount ?? 0) < 10 : false
  const isNonDiscardable = item?.failureCode ? NON_DISCARDABLE_CODES.has(item.failureCode) : false
  const categoryLabel = item?.failureCode ? (ERROR_CATEGORY_LABELS[item.failureCode] ?? null) : null

  // Hooks must be called unconditionally (before any early return)
  const handleRetry = useCallback(async () => {
    if (!onRetry || !canRetry || retrying || !item) return
    setRetrying(true)
    try { await onRetry(item.commandId) } finally { setRetrying(false) }
  }, [onRetry, canRetry, retrying, item])

  // Focus trap: focus dialog on open, restore on close
  useEffect(() => {
    if (item) dialogRef.current?.focus()
  }, [item])

  // Keyboard: Escape closes
  useEffect(() => {
    if (!item) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [item, onClose])

  if (!item) return null

  return (
    <div
      role="dialog"
      aria-label={t('offline.conflictDetail', { defaultValue: 'Conflict detail' })}
      aria-modal="true"
      ref={dialogRef}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full" role="document">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">
            {t('offline.conflictDetail', { defaultValue: 'Conflict detail' })}
          </h2>
          <button onClick={onClose} aria-label={t('common.close', { defaultValue: 'Close' })} className="p-1">
            <X size={20} />
          </button>
        </div>

        {/* Safe fields only */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">{t('offline.commandType', { defaultValue: 'Type' })}: </span>
            {t(`offline.type.${item.commandType}`, { defaultValue: item.commandType })}
          </div>
          <div>
            <span className="font-medium">{t('offline.status', { defaultValue: 'Status' })}: </span>
            {t(`offline.status.${item.status}`, { defaultValue: item.status })}
          </div>
          {categoryLabel && (
            <div className="flex items-center gap-1">
              <AlertTriangle size={14} className="text-yellow-600" />
              <span>{t(categoryLabel, { defaultValue: item.failureCode })}</span>
            </div>
          )}
          <div>
            <span className="font-medium">{t('offline.retries', { defaultValue: 'Retries' })}: </span>
            {item.retryCount ?? 0}
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={14} />
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>

          {/* Admin-review guidance for non-discardable conflicts */}
          {isNonDiscardable && (
            <div className="bg-yellow-50 border-yellow-300 border rounded p-2 text-xs mt-2">
              <Ban size={12} className="inline mr-1" />
              {t('offline.adminReviewRequired', { defaultValue: 'This conflict requires administrator review. Do not discard.' })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              aria-label={t('offline.retry', { defaultValue: 'Retry' })}
            >
              <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
              {t('offline.retry', { defaultValue: 'Retry' })}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded text-sm"
          >
            {t('common.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  )
}

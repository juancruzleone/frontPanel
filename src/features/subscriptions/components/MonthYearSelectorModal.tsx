import React from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import MonthYearSelector from './MonthYearSelector'
import styles from '../styles/subscriptions.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'

interface MonthYearSelectorModalProps {
  isOpen: boolean
  onRequestClose: () => void
  startDate: string
  endDate: string
  selectedMonths: string[]
  onMonthClick: (month: string) => void
  frequency: string
  error?: string
  onConfirm: () => void
}

const MonthYearSelectorModal: React.FC<MonthYearSelectorModalProps> = ({
  isOpen,
  onRequestClose,
  startDate,
  endDate,
  selectedMonths,
  onMonthClick,
  frequency,
  error,
  onConfirm
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onRequestClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onRequestClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('subscriptions.selectedMonths')}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onRequestClose}
            aria-label={t('common.close')}
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalContent} style={{ padding: '1.5rem' }}>
          <MonthYearSelector
            startDate={startDate}
            endDate={endDate}
            selectedMonths={selectedMonths}
            onMonthClick={onMonthClick}
            frequency={frequency}
            disabled={false}
            error={error}
          />
        </div>

        <div className={formButtonStyles.actions}>
          <button
            type="button"
            onClick={handleConfirm}
            className={formButtonStyles.submitButton}
          >
            {t('common.confirm')}
          </button>
          <button
            type="button"
            onClick={onRequestClose}
            className={formButtonStyles.cancelButton}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonthYearSelectorModal

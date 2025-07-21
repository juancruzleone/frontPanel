import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import FrequencySelector from './FrequencySelector'
import type { Subscription, FrequencyOption } from '../hooks/useSubscriptions'
import DatePickerModal from '../../calendar/components/DatePickerModal'

interface ModalEditFrequencyProps {
  isOpen: boolean
  onRequestClose: () => void
  subscription: Subscription | null
  frequencyOptions: FrequencyOption[]
  getMonthsByFrequency: (frequency: string) => string[]
  onSave: (subscriptionId: string, frequency: string, startDate?: string, endDate?: string, status?: 'active' | 'inactive' | 'pending') => Promise<{ message: string }>
  onSubmitSuccess: (message: string) => void
  onSubmitError: (message: string) => void
}

const ModalEditFrequency: React.FC<ModalEditFrequencyProps> = ({
  isOpen,
  onRequestClose,
  subscription,
  frequencyOptions,
  getMonthsByFrequency,
  onSave,
  onSubmitSuccess,
  onSubmitError
}) => {
  const { t } = useTranslation()
  const [selectedFrequency, setSelectedFrequency] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending'>('active')
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)

  useEffect(() => {
    if (subscription) {
      const currentOption = frequencyOptions.find(option => 
        option.label === subscription.frequency || option.value === subscription.frequency
      )
      setSelectedFrequency(currentOption?.value || '')
      setStartDate(subscription.startDate ? new Date(subscription.startDate).toISOString().slice(0, 10) : '')
      setEndDate(subscription.endDate ? new Date(subscription.endDate).toISOString().slice(0, 10) : '')
      setStatus(subscription.status || 'active')
      // Inicializar meses seleccionados desde la suscripción si existen
      if (subscription.months && Array.isArray(subscription.months)) {
        setSelectedMonths(subscription.months)
      }
    }
  }, [subscription, frequencyOptions])

  useEffect(() => {
    if (selectedFrequency === 'mensual' || selectedFrequency === 'anual') {
      // Todos los meses seleccionados automáticamente
      setSelectedMonths([
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ])
    } else if (selectedFrequency === 'semestral') {
      // Si ya hay 2 meses seleccionados, mantenerlos, si no, limpiar
      setSelectedMonths((prev) => prev.length === 2 ? prev : [])
    } else if (selectedFrequency === 'trimestral') {
      setSelectedMonths((prev) => prev.length === 4 ? prev : [])
    } else {
      setSelectedMonths([])
    }
  }, [selectedFrequency])

  const handleMonthClick = (month: string) => {
    if (selectedFrequency === 'semestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 2) {
        setSelectedMonths([...selectedMonths, month])
      }
    } else if (selectedFrequency === 'trimestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 4) {
        setSelectedMonths([...selectedMonths, month])
      }
    }
  }

  const isMonthSelectable = (month: string) => {
    return selectedFrequency === 'semestral' || selectedFrequency === 'trimestral'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  const canSave = () => {
    if (selectedFrequency === 'semestral') return selectedMonths.length === 2
    if (selectedFrequency === 'trimestral') return selectedMonths.length === 4
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscription || !selectedFrequency) {
      onSubmitError(t('subscriptions.selectFrequency'))
      return
    }
    setIsSubmitting(true)
    try {
      await onSave(subscription._id, selectedFrequency, startDate, endDate, status)
      onSubmitSuccess(t('subscriptions.frequencyUpdated'))
      onRequestClose()
    } catch (error: any) {
      onSubmitError(error.message || t('subscriptions.errorUpdating'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onRequestClose()
    }
  }

  if (!isOpen || !subscription) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('subscriptions.editFrequency')}
          </h2>
          <button
            className={styles.closeButtonIcon}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close')}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.subscriptionInfo}>
            <h3>{subscription.installationName}</h3>
            <p>{subscription.address}, {subscription.city}, {subscription.province}</p>
            <p><strong>{t('subscriptions.table.type')}:</strong> {subscription.installationType}</p>
            <p><strong>{t('subscriptions.table.frequency')}:</strong> {subscription.frequency}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.frequencyForm}>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>{t('subscriptions.newFrequency')}</label>
              <FrequencySelector
                value={selectedFrequency}
                onChange={setSelectedFrequency}
                options={frequencyOptions}
                disabled={isSubmitting}
                placeholder={t('subscriptions.selectFrequency')}
                size="large"
                className={styles.statusSelect}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t('subscriptions.startDate')}</label>
              <input
                type="text"
                value={startDate ? new Date(startDate).toLocaleDateString(t('common.language') || 'es') : ''}
                onClick={() => setIsStartDatePickerOpen(true)}
                readOnly
                className={styles.inputDate}
                placeholder={t('subscriptions.selectStartDate')}
                style={{ cursor: 'pointer' }}
              />
              <DatePickerModal
                isOpen={isStartDatePickerOpen}
                onRequestClose={() => setIsStartDatePickerOpen(false)}
                onDateSelect={(date) => { setStartDate(date); setIsStartDatePickerOpen(false); }}
                selectedDate={startDate}
                title={t('subscriptions.selectStartDate')}
              />
            </div>
            <div className={styles.formGroup}>
              <label>{t('subscriptions.endDate')}</label>
              <input
                type="text"
                value={endDate ? new Date(endDate).toLocaleDateString(t('common.language') || 'es') : ''}
                onClick={() => setIsEndDatePickerOpen(true)}
                readOnly
                className={styles.inputDate}
                placeholder={t('subscriptions.selectEndDate')}
                style={{ cursor: 'pointer' }}
              />
              <DatePickerModal
                isOpen={isEndDatePickerOpen}
                onRequestClose={() => setIsEndDatePickerOpen(false)}
                onDateSelect={(date) => { setEndDate(date); setIsEndDatePickerOpen(false); }}
                selectedDate={endDate}
                title={t('subscriptions.selectEndDate')}
              />
            </div>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>{t('subscriptions.status.label')}</label>
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  disabled={isSubmitting}
                  className={styles.statusSelect}
                  style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%' }}
                >
                  <option value="active">{t('subscriptions.status.active')}</option>
                  <option value="inactive">{t('subscriptions.status.inactive')}</option>
                </select>
                <ChevronDown
                  size={20}
                  className={styles.selectIcon}
                />
              </span>
            </div>
            {(selectedFrequency === 'semestral' || selectedFrequency === 'trimestral') && (
              <div className={styles.formGroup}>
                <label className={styles.monthsLabel}>
                  <Calendar size={16} />
                  {t('subscriptions.selectedMonths')}
                </label>
                <div className={styles.monthsPreview}>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month, index) => (
                    <span
                      key={index}
                      className={
                        styles.monthTag +
                        (isMonthSelected(month) ? ' ' + styles.monthTagSelected : '') +
                        (isMonthSelectable(month) ? ' ' + styles.monthTagSelectable : '')
                      }
                      onClick={() => isMonthSelectable(month) && handleMonthClick(month)}
                      style={{ cursor: isMonthSelectable(month) ? 'pointer' : 'default' }}
                    >
                      {month}
                    </span>
                  ))}
                </div>
                <div className={styles.monthsHelp}>
                  {selectedFrequency === 'semestral' && t('subscriptions.selectTwoMonths')}
                  {selectedFrequency === 'trimestral' && t('subscriptions.selectFourMonths')}
                </div>
              </div>
            )}
            {(selectedFrequency === 'mensual' || selectedFrequency === 'anual') && (
              <div className={styles.formGroup}>
                <label className={styles.monthsLabel}>
                  <Calendar size={16} />
                  {t('subscriptions.selectedMonths')}
                </label>
                <div className={styles.monthsPreview}>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month, index) => (
                    <span key={index} className={styles.monthTag + ' ' + styles.monthTagSelected}>
                      {month}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className={styles.cancelButton}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !canSave()}
                className={styles.saveButton}
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ModalEditFrequency 
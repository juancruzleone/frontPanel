import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import FrequencySelector from './FrequencySelector'
import type { Subscription, FrequencyOption } from '../hooks/useSubscriptions'
import DatePickerModal from '../../calendar/components/DatePickerModal'
import { validateSubscriptionForm } from '../validators/subscriptionValidations';
import useSubscriptions from '../hooks/useSubscriptions'
import { useCallback } from 'react'

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
  onSave,
  onSubmitSuccess,
  onSubmitError
}) => {
  const { t } = useTranslation()
  const {
    frequencyOptions,
    getMonthsByFrequency,
    updateSubscription,
  } = useSubscriptions()
  const [formData, setFormData] = useState<{
    frequency: string
    startDate: string
    endDate: string
    status: 'active' | 'inactive' | 'pending'
  }>({
    frequency: '',
    startDate: '',
    endDate: '',
    status: 'active',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)
  const [isError, setIsError] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")

  useEffect(() => {
    if (isOpen && subscription) {
      const normalizeDate = (date: any) => {
        if (!date) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        // Intenta convertir a YYYY-MM-DD
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
      };
      setFormData({
        frequency: subscription.frequency || '',
        startDate: normalizeDate(subscription.startDate),
        endDate: normalizeDate(subscription.endDate),
        status: subscription.status || 'active',
      });
      if (subscription.months && Array.isArray(subscription.months)) {
        setSelectedMonths(subscription.months);
      }
      setFormErrors({});
      setTouchedFields({});
      setIsSubmitting(false);
      setIsError(false);
      setResponseMessage('');
    }
  }, [isOpen, subscription?._id]);

  useEffect(() => {
    if (isOpen) {
      setIsError(false)
      setResponseMessage("")
      setFormErrors({})
      setTouchedFields({})
      setIsSubmitting(false)
    }
  }, [isOpen])

  const handleFieldChange = useCallback(async (name: string, value: any) => {
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)
    setTouchedFields((prev) => ({ ...prev, [name]: true }))
    const validation = await validateSubscriptionForm({
      tipo: updatedData.frequency,
      fechaInicio: updatedData.startDate,
      fechaFin: updatedData.endDate,
      estado: updatedData.status,
    }, t)
    setFormErrors(validation.errors)
  }, [formData, t])

  const handleFieldBlur = useCallback(async (name: string) => {
    setTouchedFields((prev) => ({ ...prev, [name]: true }))
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }, t)
    setFormErrors(validation.errors)
  }, [formData, t])

  const handleSubmitForm = async (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    subscriptionId: string,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTouchedFields({ frequency: true, startDate: true, endDate: true, status: true })
    const validation = await validateSubscriptionForm({
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }, t)
    setFormErrors(validation.errors)
    if (!validation.isValid) {
      setIsSubmitting(false)
      return
    }
    try {
      await updateSubscription(subscriptionId, {
        frequency: formData.frequency,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        status: formData.status,
      })
      onSuccess(t('subscriptions.frequencyUpdated'))
      setFormData({ frequency: '', startDate: '', endDate: '', status: 'active' })
      setFormErrors({})
      setTouchedFields({})
    } catch (err: any) {
      onError(err.message || t('subscriptions.errorUpdating'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMonthClick = (month: string) => {
    if (formData.frequency === 'semestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 2) {
        setSelectedMonths([...selectedMonths, month])
      }
    } else if (formData.frequency === 'trimestral') {
      if (selectedMonths.includes(month)) {
        setSelectedMonths(selectedMonths.filter(m => m !== month))
      } else if (selectedMonths.length < 4) {
        setSelectedMonths([...selectedMonths, month])
      }
    }
  }

  const isMonthSelectable = (month: string) => {
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  const canSave = () => {
    if (formData.frequency === 'semestral') return selectedMonths.length === 2
    if (formData.frequency === 'trimestral') return selectedMonths.length === 4
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscription) {
      setIsError(true)
      setResponseMessage(t('subscriptions.selectFrequency'))
      return
    }
    // Validación con Yup
    const dataToValidate = {
      tipo: formData.frequency,
      fechaInicio: formData.startDate,
      fechaFin: formData.endDate,
      estado: formData.status,
    }
    const validation = await validateSubscriptionForm(dataToValidate, t)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsError(false)
      setResponseMessage("")
      return
    }
    setFormErrors({})
    setIsSubmitting(true)
    try {
      await onSave(subscription._id, formData.frequency, formData.startDate, formData.endDate, formData.status)
      onSubmitSuccess(t('subscriptions.frequencyUpdated'))
      onRequestClose()
    } catch (error: any) {
      setIsError(true)
      setResponseMessage(error.message || t('subscriptions.errorUpdating'))
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

          <form onSubmit={(e) => handleSubmitForm(e, (msg) => {
            setIsError(false); setResponseMessage(msg); onSubmitSuccess(msg); onRequestClose();
          }, (msg) => {
            setIsError(true); setResponseMessage(msg); onSubmitError(msg);
          }, subscription._id)} className={styles.frequencyForm} noValidate>
            {/* Mostrar error general solo si es de red/backend */}
            {isError && responseMessage && (
              <div className={styles.inputError}>{responseMessage}</div>
            )}
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>{t('subscriptions.newFrequency')}</label>
              <FrequencySelector
                value={formData.frequency || ''}
                onChange={(val) => handleFieldChange('frequency', val)}
                options={frequencyOptions}
                disabled={isSubmitting}
                placeholder={t('subscriptions.selectFrequency')}
                size="large"
                className={styles.statusSelect}
                onBlur={() => handleFieldBlur('frequency')}
              />
              {(touchedFields['frequency'] && formErrors['tipo']) && (
                <div className={styles.inputError}>{formErrors['tipo']}</div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>{t('subscriptions.startDate')}</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={
                    formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
                      ? formData.startDate.split('-').reverse().join('/')
                      : ''
                  }
                  onClick={() => setIsStartDatePickerOpen(true)}
                  readOnly
                  className={styles.inputDate}
                  placeholder={t('subscriptions.selectStartDate')}
                  style={{ cursor: 'pointer', paddingRight: 40 }}
                  onBlur={() => handleFieldBlur('startDate')}
                />
                <Calendar
                  size={20}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7 }}
                  onClick={() => setIsStartDatePickerOpen(true)}
                  aria-label={t('subscriptions.selectStartDate')}
                />
              </div>
              <DatePickerModal
                isOpen={isStartDatePickerOpen}
                onRequestClose={() => setIsStartDatePickerOpen(false)}
                onDateSelect={(date) => { handleFieldChange('startDate', date); setIsStartDatePickerOpen(false); }}
                selectedDate={formData.startDate as string}
                title={t('subscriptions.selectStartDate')}
                placeholder={t('subscriptions.selectStartDate')}
              />
              {(touchedFields['startDate'] && formErrors['fechaInicio']) && (
                <div className={styles.inputError}>{formErrors['fechaInicio']}</div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>{t('subscriptions.endDate')}</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  value={
                    formData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.endDate)
                      ? formData.endDate.split('-').reverse().join('/')
                      : ''
                  }
                  onClick={() => setIsEndDatePickerOpen(true)}
                  readOnly
                  className={styles.inputDate}
                  placeholder={t('subscriptions.selectEndDate')}
                  style={{ cursor: 'pointer', paddingRight: 40 }}
                  onBlur={() => handleFieldBlur('endDate')}
                />
                <Calendar
                  size={20}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7 }}
                  onClick={() => setIsEndDatePickerOpen(true)}
                  aria-label={t('subscriptions.selectEndDate')}
                />
              </div>
              <DatePickerModal
                isOpen={isEndDatePickerOpen}
                onRequestClose={() => setIsEndDatePickerOpen(false)}
                onDateSelect={(date) => { handleFieldChange('endDate', date); setIsEndDatePickerOpen(false); }}
                selectedDate={formData.endDate as string}
                title={t('subscriptions.selectEndDate')}
                placeholder={t('subscriptions.selectEndDate')}
              />
              {(touchedFields['endDate'] && formErrors['fechaFin']) && (
                <div className={styles.inputError}>{formErrors['fechaFin']}</div>
              )}
            </div>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>{t('subscriptions.status.label')}</label>
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <select
                  value={formData.status || 'active'}
                  onChange={e => handleFieldChange('status', e.target.value)}
                  disabled={isSubmitting}
                  className={styles.statusSelect}
                  style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%' }}
                  onBlur={() => handleFieldBlur('status')}
                >
                  <option value="active">{t('subscriptions.status.active')}</option>
                  <option value="inactive">{t('subscriptions.status.inactive')}</option>
                </select>
                <ChevronDown
                  size={20}
                  className={styles.selectIcon}
                />
              </span>
              {(touchedFields['status'] && formErrors['estado']) && (
                <div className={styles.inputError}>{formErrors['estado']}</div>
              )}
            </div>
            {(formData.frequency === 'semestral' || formData.frequency === 'trimestral') && (
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
                  {formData.frequency === 'semestral' && t('subscriptions.selectTwoMonths')}
                  {formData.frequency === 'trimestral' && t('subscriptions.selectFourMonths')}
                </div>
              </div>
            )}
            {(formData.frequency === 'mensual' || formData.frequency === 'anual') && (
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
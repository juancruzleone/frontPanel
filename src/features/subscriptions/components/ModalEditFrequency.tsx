import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/Modal.module.css'
import subscriptionStyles from '../styles/subscriptions.module.css'
import type { Subscription, FrequencyOption } from '../hooks/useSubscriptions'
import { useSubscriptions } from '../hooks/useSubscriptions'
import FrequencyForm from './FrequencyForm'
import { translateFrequencyToCurrentLang } from '../../../shared/utils/backendTranslations';

interface ModalEditFrequencyProps {
  isOpen: boolean
  onRequestClose: () => void
  subscription: Subscription | null
  frequencyOptions: FrequencyOption[]
  onSave: (subscriptionId: string, frequency: string, startDate?: string, endDate?: string, status?: 'active' | 'inactive' | 'pending', months?: string[]) => Promise<{ message: string }>
  onSubmitSuccess: (message: string) => void
  onSubmitError: (message: string) => void
}

const ModalEditFrequency: React.FC<ModalEditFrequencyProps> = ({
  isOpen,
  onRequestClose,
  subscription,
  frequencyOptions,
  onSave,
  onSubmitSuccess,
  onSubmitError
}) => {
  const { t, i18n } = useTranslation()
  const {
    formData,
    setFormData,
    formErrors,
    touchedFields,
    setTouchedFields,
    isSubmitting,
    handleFieldChange,
    handleFieldBlur,
    selectedMonths,
    setSelectedMonths,
    isStartDatePickerOpen,
    setIsStartDatePickerOpen,
    isEndDatePickerOpen,
    setIsEndDatePickerOpen,
    isError,
    setIsError,
    responseMessage,
    setResponseMessage,
    handleMonthClick,
    canSave,
    handleStartDateClose,
    handleEndDateClose,
    handleStartDateSelect,
    handleEndDateSelect,
    resetFrequencyForm,
    validateAllFields,
    monthsError,
  } = useSubscriptions()

  useEffect(() => {
    if (isOpen && subscription) {
      const normalizeDate = (date: string | Date | null | undefined) => {
        if (!date) return '';
        // Si es string y parece una fecha ISO, extraer la parte de fecha
        if (typeof date === 'string') {
          const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
          }
        }

        // Si es objeto Date
        if (date instanceof Date && !isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        return '';
      };

      setFormData({
        frequency: subscription.frequency || '',
        startDate: normalizeDate(subscription.startDate),
        endDate: normalizeDate(subscription.endDate),
        status: subscription.status || 'active',
      });

      if (subscription.months && Array.isArray(subscription.months)) {
        setSelectedMonths(subscription.months);
      } else {
        setSelectedMonths([]);
      }

      setIsError(false);
      setResponseMessage('');
      setIsStartDatePickerOpen(false);
      setIsEndDatePickerOpen(false);
    }

    if (!isOpen) {
      resetFrequencyForm();
    }
  }, [isOpen, subscription, resetFrequencyForm, setFormData, setIsEndDatePickerOpen, setIsError, setIsStartDatePickerOpen, setResponseMessage, setSelectedMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subscription) {
      setIsError(true)
      setResponseMessage(t('subscriptions.selectFrequency'))
      return
    }

    // CAMBIO: Marcar todos los campos como tocados antes de validar
    setTouchedFields({
      frequency: true,
      startDate: true,
      endDate: true,
      status: true
    })

    // Validar todos los campos
    const isValid = await validateAllFields()

    if (!isValid) {
      // Los errores ya estarán en formErrors y se mostrarán en el formulario
      return
    }

    try {
      setIsError(false)
      setResponseMessage("")

      const result = await onSave(
        subscription._id,
        formData.frequency || '',
        formData.startDate || undefined,
        formData.endDate || undefined,
        formData.status as 'active' | 'inactive' | 'pending' || 'active',
        selectedMonths.length > 0 ? selectedMonths : undefined
      )

      onSubmitSuccess(result.message || t('subscriptions.frequencyUpdated'))
      onRequestClose()
    } catch (error: unknown) {
      setIsError(true)
      const errorMessage = (error as Error).message || t('subscriptions.errorUpdating')
      setResponseMessage(errorMessage)
      onSubmitError(errorMessage)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onRequestClose()
    }
  }

  if (!isOpen || !subscription) return null

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>
              {t('subscriptions.editFrequency')}
            </h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close')}
            type="button"
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={subscriptionStyles.subscriptionInfo}>
            <h3>{subscription.installationName}</h3>
            <p>{subscription.address}, {subscription.city}, {subscription.province}</p>
            <p><strong>{t('subscriptions.table.type')}:</strong> {subscription.installationType}</p>
            <p><strong>{t('subscriptions.table.frequency')}:</strong> {translateFrequencyToCurrentLang(subscription.frequency, i18n.language)}</p>
          </div>
          <FrequencyForm
            formData={formData}
            formErrors={formErrors}
            touchedFields={touchedFields}
            isSubmitting={isSubmitting}
            selectedMonths={selectedMonths}
            isStartDatePickerOpen={isStartDatePickerOpen}
            isEndDatePickerOpen={isEndDatePickerOpen}
            isError={isError}
            responseMessage={responseMessage}
            frequencyOptions={frequencyOptions}
            onFieldChange={(name, value) => {
              if (name === 'isStartDatePickerOpen') setIsStartDatePickerOpen(Boolean(value))
              else if (name === 'isEndDatePickerOpen') setIsEndDatePickerOpen(Boolean(value))
              else handleFieldChange(name, String(value))
            }}
            onFieldBlur={handleFieldBlur}
            onStartDateClose={handleStartDateClose}
            onEndDateClose={handleEndDateClose}
            onStartDateSelect={handleStartDateSelect}
            onEndDateSelect={handleEndDateSelect}
            onMonthClick={handleMonthClick}
            canSave={canSave}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            monthsError={monthsError}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEditFrequency

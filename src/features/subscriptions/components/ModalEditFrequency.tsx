import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import FrequencySelector from './FrequencySelector'
import type { Subscription, FrequencyOption } from '../hooks/useSubscriptions'
import DatePickerModal from '../../calendar/components/DatePickerModal'
import { validateSubscriptionForm } from '../validators/subscriptionValidations'
import { useSubscriptions } from '../hooks/useSubscriptions'
import FrequencyForm from './FrequencyForm'
import { translateFrequencyToCurrentLang } from '../../../shared/utils/backendTranslations';

interface ModalEditFrequencyProps {
  isOpen: boolean
  onRequestClose: () => void
  subscription: Subscription | null
  frequencyOptions: FrequencyOption[]
  getMonthsByFrequency: (frequency: string) => string[]
  onSave: (subscriptionId: string, frequency: string, startDate?: string, endDate?: string, status?: 'active' | 'inactive' | 'pending', months?: string[]) => Promise<{ message: string }>
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
    setMonthsError,
  } = useSubscriptions()

  useEffect(() => {
    if (isOpen && subscription) {
      const normalizeDate = (date: any) => {
        if (!date) return '';
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
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
  }, [isOpen, subscription?._id]);

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
    } catch (error: any) {
      setIsError(true)
      const errorMessage = error.message || t('subscriptions.errorUpdating')
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
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('subscriptions.editFrequency')}
          </h2>
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
          <div className={styles.subscriptionInfo}>
            <h3>{subscription.installationName}</h3>
            <p>{subscription.address}, {subscription.city}, {subscription.province}</p>
            <p><strong>{t('subscriptions.table.type')}:</strong> {subscription.installationType}</p>
            <p><strong>{t('subscriptions.table.frequency')}:</strong> {translateFrequencyToCurrentLang(subscription.frequency, t('i18n.language'))}</p>
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
              if (name === 'isStartDatePickerOpen') setIsStartDatePickerOpen(value)
              else if (name === 'isEndDatePickerOpen') setIsEndDatePickerOpen(value)
              else handleFieldChange(name, value)
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
            getMonthsByFrequency={getMonthsByFrequency}
            monthsError={monthsError}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEditFrequency
import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import DatePickerModal from './DatePickerModal'
import HybridSelect from '../../../shared/components/HybridSelect'
import MonthYearSelectorModal from './MonthYearSelectorModal'
import type { FrequencyOption } from '../hooks/useSubscriptions'

interface FrequencyFormProps {
  formData: {
    frequency: string
    startDate: string
    endDate: string
    status: 'active' | 'inactive' | 'pending'
  }
  formErrors: Record<string, string>
  touchedFields: Record<string, boolean>
  isSubmitting: boolean
  selectedMonths: string[]
  isStartDatePickerOpen: boolean
  isEndDatePickerOpen: boolean
  isError: boolean
  responseMessage: string
  frequencyOptions: FrequencyOption[]
  onFieldChange: (name: string, value: any) => void
  onFieldBlur: (name: string) => void
  onStartDateClose: () => void
  onEndDateClose: () => void
  onStartDateSelect: (date: string) => void
  onEndDateSelect: (date: string) => void
  onMonthClick: (month: string) => void
  canSave: () => boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  getMonthsByFrequency: (frequency: string) => string[]
  monthsError: string
}

const FrequencyForm: React.FC<FrequencyFormProps> = ({
  formData,
  formErrors,
  touchedFields,
  isSubmitting,
  selectedMonths,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  isError,
  responseMessage,
  frequencyOptions,
  onFieldChange,
  onFieldBlur,
  onStartDateClose,
  onEndDateClose,
  onStartDateSelect,
  onEndDateSelect,
  onMonthClick,
  canSave,
  onSubmit,
  onCancel,
  getMonthsByFrequency,
  monthsError,
}) => {
  const { t } = useTranslation()
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false)

  const isMonthSelectable = (month: string) => {
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral' || formData.frequency === 'anual' || formData.frequency === 'mensual'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  // Obtener el primer mes seleccionado basado en la fecha de inicio
  const getFirstMonth = () => {
    if (selectedMonths.length === 0 || !formData.startDate) return null

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const startDate = new Date(formData.startDate)
    const startMonth = startDate.getMonth()

    // Si la frecuencia es mensual, devolver el mes de inicio
    if (formData.frequency === 'mensual') {
      return monthNames[startMonth]
    }

    // Para otras frecuencias, devolver el primer mes del array
    return selectedMonths[0]
  }

  // Handlers para abrir DatePicker sin validación
  const handleDateInputClick = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'start') {
      onFieldChange('isStartDatePickerOpen', true)
    } else {
      onFieldChange('isEndDatePickerOpen', true)
    }
  }

  // Manejador de envío del formulario
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  // Handler simplificado para blur - solo para campos que no sean fechas desde DatePicker
  const handleFieldBlurIfNotFromDatePicker = (fieldName: string) => {
    // Solo ejecutar blur si no estamos interactuando con DatePickers
    setTimeout(() => {
      onFieldBlur(fieldName)
    }, 150)
  }

  return (
    <form onSubmit={handleFormSubmit} className={styles.form} noValidate>
      <div className={styles.formInner}>
        {isError && responseMessage && (
          <div className={styles.inputError}>{responseMessage}</div>
        )}
        <div className={styles.formGroup}>
          <label>{t('subscriptions.table.frequency')}</label>
          <HybridSelect
            value={formData.frequency || ''}
            onChange={(val) => onFieldChange('frequency', val)}
            onBlur={() => onFieldBlur('frequency')}
            options={frequencyOptions.map(option => ({ value: option.value, label: option.label }))}
            disabled={isSubmitting}
            placeholder={t('subscriptions.selectFrequency')}
            className={styles.statusSelect}
          />
          {(!!formErrors['tipo'] && touchedFields['frequency']) && (
            <div className={styles.inputError}>{formErrors['tipo']}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('subscriptions.startDate')}</label>
          <div
            onClick={(e) => handleDateInputClick(e, 'start')}
            className={styles.dateSelectButton}
            style={{
              cursor: 'pointer',
              padding: '0.875rem 1rem',
              border: '2px solid var(--color-card-border)',
              borderRadius: '12px',
              backgroundColor: 'var(--color-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem'
            }}
          >
            <span style={{ color: formData.startDate ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
              {formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
                ? formData.startDate.split('-').reverse().join('/')
                : t('subscriptions.selectStartDate')}
            </span>
            <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <DatePickerModal
            isOpen={isStartDatePickerOpen}
            onRequestClose={onStartDateClose}
            onDateSelect={onStartDateSelect}
            selectedDate={formData.startDate as string}
            title={t('subscriptions.selectStartDate')}
            placeholder={t('subscriptions.selectStartDate')}
          />
          {(!!formErrors['fechaInicio'] && touchedFields['startDate']) && (
            <div className={styles.inputError}>{formErrors['fechaInicio']}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('subscriptions.endDate')}</label>
          <div
            onClick={(e) => handleDateInputClick(e, 'end')}
            className={styles.dateSelectButton}
            style={{
              cursor: 'pointer',
              padding: '0.875rem 1rem',
              border: '2px solid var(--color-card-border)',
              borderRadius: '12px',
              backgroundColor: 'var(--color-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              fontSize: '0.95rem'
            }}
          >
            <span style={{ color: formData.endDate ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
              {formData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.endDate)
                ? formData.endDate.split('-').reverse().join('/')
                : t('subscriptions.selectEndDate')}
            </span>
            <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </div>
          <DatePickerModal
            isOpen={isEndDatePickerOpen}
            onRequestClose={onEndDateClose}
            onDateSelect={onEndDateSelect}
            selectedDate={formData.endDate as string}
            title={t('subscriptions.selectEndDate')}
            placeholder={t('subscriptions.selectEndDate')}
          />
          {(!!formErrors['fechaFin'] && touchedFields['endDate']) && (
            <div className={styles.inputError}>{formErrors['fechaFin']}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('subscriptions.status.label')}</label>
          <HybridSelect
            value={formData.status || 'active'}
            onChange={(value) => onFieldChange('status', value)}
            options={[
              { value: 'active', label: t('subscriptions.status.active') },
              { value: 'inactive', label: t('subscriptions.status.inactive') }
            ]}
            placeholder={t('subscriptions.status.placeholder')}
            disabled={isSubmitting}
            className={styles.statusSelect}
          />
          {(!!formErrors['estado'] && touchedFields['status']) && (
            <div className={styles.inputError}>{formErrors['estado']}</div>
          )}
        </div>

        {(formData.frequency === 'semestral' || formData.frequency === 'trimestral' || formData.frequency === 'anual' || formData.frequency === 'mensual') && (
          <div className={styles.formGroup}>
            <label className={styles.monthsLabel}>
              {t('subscriptions.selectedMonths')}
            </label>
            <div
              className={styles.monthsPreviewButton}
              onClick={() => setIsMonthSelectorOpen(true)}
              style={{
                cursor: 'pointer',
                padding: '0.875rem 1rem',
                border: '2px solid var(--color-card-border)',
                borderRadius: '12px',
                backgroundColor: 'var(--color-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              <span style={{ color: selectedMonths.length > 0 ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                {selectedMonths.length > 0
                  ? formData.frequency === 'mensual' && getFirstMonth()
                    ? `${getFirstMonth()} - ${selectedMonths.length} ${selectedMonths.length === 1 ? t('subscriptions.month') : t('subscriptions.months')}`
                    : `${selectedMonths.length} ${selectedMonths.length === 1 ? t('subscriptions.monthSelected') : t('subscriptions.monthsSelected')}`
                  : t('subscriptions.clickToSelectMonths')
                }
              </span>
              <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </div>
            {monthsError && (
              <div className={styles.inputError}>{monthsError}</div>
            )}
            <MonthYearSelectorModal
              isOpen={isMonthSelectorOpen}
              onRequestClose={() => setIsMonthSelectorOpen(false)}
              startDate={formData.startDate}
              endDate={formData.endDate}
              selectedMonths={selectedMonths}
              onMonthClick={onMonthClick}
              frequency={formData.frequency}
              error={monthsError}
              onConfirm={() => setIsMonthSelectorOpen(false)}
            />
          </div>
        )}
      </div>

      <div className={formButtonStyles.actions}>
        <button
          type="submit"
          disabled={isSubmitting || !canSave()}
          className={formButtonStyles.submitButton}
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={formButtonStyles.cancelButton}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

export default FrequencyForm
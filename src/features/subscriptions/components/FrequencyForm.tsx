import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import FrequencySelector from './FrequencySelector'
import DatePickerModal from './DatePickerModal'
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
}) => {
  const { t } = useTranslation()

  const isMonthSelectable = (month: string) => {
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral' || formData.frequency === 'anual' || formData.frequency === 'mensual'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

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

  // Manejador específico para los íconos de calendario
  const handleCalendarIconClick = (e: React.MouseEvent, type: 'start' | 'end') => {
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
    <form onSubmit={handleFormSubmit} className={styles.frequencyForm} noValidate>
      {isError && responseMessage && (
        <div className={styles.inputError}>{responseMessage}</div>
      )}
      <div className={styles.formGroup} style={{ position: 'relative' }}>
        <label>{t('subscriptions.newFrequency')}</label>
        <FrequencySelector
          value={formData.frequency || ''}
          onChange={(val) => onFieldChange('frequency', val)}
          options={frequencyOptions}
          disabled={isSubmitting}
          placeholder={t('subscriptions.selectFrequency')}
          size="large"
          className={styles.statusSelect}
          onBlur={() => handleFieldBlurIfNotFromDatePicker('frequency')}
        />
        {(!!formErrors['tipo'] && touchedFields['frequency']) && (
          <div className={styles.inputError}>{formErrors['tipo']}</div>
        )}
      </div>
      
      <div className={styles.formGroup}>
        <label>{t('subscriptions.startDate')}</label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            data-date-input="start"
            value={
              formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
                ? formData.startDate.split('-').reverse().join('/')
                : ''
            }
            onClick={(e) => handleDateInputClick(e, 'start')}
            onBlur={() => handleFieldBlurIfNotFromDatePicker('startDate')}
            readOnly
            className={styles.inputDate}
            placeholder={t('subscriptions.selectStartDate')}
            style={{ cursor: 'pointer', paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={(e) => handleCalendarIconClick(e, 'start')}
            aria-label={t('subscriptions.selectStartDate')}
            className={styles.calendarIconButton}
          >
            <Calendar size={20} />
          </button>
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
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            data-date-input="end"
            value={
              formData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.endDate)
                ? formData.endDate.split('-').reverse().join('/')
                : ''
            }
            onClick={(e) => handleDateInputClick(e, 'end')}
            onBlur={() => handleFieldBlurIfNotFromDatePicker('endDate')}
            readOnly
            className={styles.inputDate}
            placeholder={t('subscriptions.selectEndDate')}
            style={{ cursor: 'pointer', paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={(e) => handleCalendarIconClick(e, 'end')}
            aria-label={t('subscriptions.selectEndDate')}
            className={styles.calendarIconButton}
          >
            <Calendar size={20} />
          </button>
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
      
      <div className={styles.formGroup} style={{ position: 'relative' }}>
        <label>{t('subscriptions.status.label')}</label>
        <span style={{ position: 'relative', display: 'block', width: '100%' }}>
          <select
            value={formData.status || 'active'}
            onChange={e => onFieldChange('status', e.target.value)}
            disabled={isSubmitting}
            className={styles.statusSelect}
            style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%' }}
            onBlur={() => handleFieldBlurIfNotFromDatePicker('status')}
          >
            <option value="active">{t('subscriptions.status.active')}</option>
            <option value="inactive">{t('subscriptions.status.inactive')}</option>
          </select>
          <ChevronDown
            size={20}
            className={styles.selectIcon}
          />
        </span>
        {(!!formErrors['estado'] && touchedFields['status']) && (
          <div className={styles.inputError}>{formErrors['estado']}</div>
        )}
      </div>
      
      {(formData.frequency === 'semestral' || formData.frequency === 'trimestral' || formData.frequency === 'anual' || formData.frequency === 'mensual') && (
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
                onClick={() => isMonthSelectable(month) && onMonthClick(month)}
                style={{ cursor: isMonthSelectable(month) ? 'pointer' : 'default' }}
              >
                {month}
              </span>
            ))}
          </div>
          <div className={styles.monthsHelp}>
            {formData.frequency === 'semestral' && t('subscriptions.selectTwoMonths')}
            {formData.frequency === 'trimestral' && t('subscriptions.selectFourMonths')}
            {formData.frequency === 'anual' && t('subscriptions.selectOneMonth')}
            {formData.frequency === 'mensual' && t('subscriptions.selectAllMonths')}
          </div>
        </div>
      )}

      <div className={formButtonStyles.actions}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={formButtonStyles.cancelButton}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !canSave()}
          className={formButtonStyles.submitButton}
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

export default FrequencyForm
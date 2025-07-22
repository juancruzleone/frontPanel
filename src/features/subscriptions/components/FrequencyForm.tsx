import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown } from 'lucide-react'
import styles from '../styles/subscriptions.module.css'
import FrequencySelector from './FrequencySelector'
import DatePickerModal from '../../calendar/components/DatePickerModal'
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
    return formData.frequency === 'semestral' || formData.frequency === 'trimestral'
  }

  const isMonthSelected = (month: string) => selectedMonths.includes(month)

  const handleDateInputClick = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    if (type === 'start') {
      onFieldChange('isStartDatePickerOpen', true)
    } else {
      onFieldChange('isEndDatePickerOpen', true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'start' | 'end') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (type === 'start') {
        onFieldChange('isStartDatePickerOpen', true)
      } else {
        onFieldChange('isEndDatePickerOpen', true)
      }
    }
  }

  // Handler mejorado para el formulario que previene Enter cuando hay modales abiertos
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      // Si algún modal está abierto, siempre prevenir el submit
      if (isStartDatePickerOpen || isEndDatePickerOpen) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      
      const target = e.target as HTMLElement;
      // Solo permitir Enter en el botón de submit y textareas
      if (
        !(target instanceof HTMLButtonElement && target.type === 'submit') &&
        target.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
      }
    }
  }

  // Handler para prevenir el submit cuando se hace click fuera de los botones
  const handleFormSubmit = (e: React.FormEvent) => {
    // Si algún modal está abierto, prevenir el submit
    if (isStartDatePickerOpen || isEndDatePickerOpen) {
      e.preventDefault()
      return
    }
    onSubmit(e)
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className={styles.frequencyForm}
      noValidate
      onKeyDown={handleFormKeyDown}
    >
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
          onBlur={() => onFieldBlur('frequency')}
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
            value={
              formData.startDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.startDate)
                ? formData.startDate.split('-').reverse().join('/')
                : ''
            }
            onClick={(e) => handleDateInputClick(e, 'start')}
            onKeyDown={(e) => handleKeyDown(e, 'start')}
            readOnly
            className={styles.inputDate}
            placeholder={t('subscriptions.selectStartDate')}
            style={{ cursor: 'pointer', paddingRight: 40 }}
          />
          <Calendar
            size={20}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7 }}
            onClick={(e) => handleDateInputClick(e as any, 'start')}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            aria-label={t('subscriptions.selectStartDate')}
          />
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
            value={
              formData.endDate && /^\d{4}-\d{2}-\d{2}$/.test(formData.endDate)
                ? formData.endDate.split('-').reverse().join('/')
                : ''
            }
            onClick={(e) => handleDateInputClick(e, 'end')}
            onKeyDown={(e) => handleKeyDown(e, 'end')}
            readOnly
            className={styles.inputDate}
            placeholder={t('subscriptions.selectEndDate')}
            style={{ cursor: 'pointer', paddingRight: 40 }}
          />
          <Calendar
            size={20}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7 }}
            onClick={(e) => handleDateInputClick(e as any, 'end')}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            aria-label={t('subscriptions.selectEndDate')}
          />
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
            onBlur={() => onFieldBlur('status')}
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
          onClick={onCancel}
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
  )
}

export default FrequencyForm
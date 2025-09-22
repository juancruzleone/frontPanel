import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '../../../shared/hooks/useTheme'
import styles from '../styles/workOrderForm.module.css'
import formButtonStyles from '../../../shared/components/Buttons/formButtons.module.css'
import type { WorkOrder } from '../hooks/useWorkOrders'
import { validateWorkOrderForm, validateWorkOrderField } from '../validators/workOrderValidations'
import DatePickerModal from '../../calendar/components/DatePickerModal'
import TimePickerModal from '../../calendar/components/TimePickerModal'
import HybridSelect from './HybridSelect'

interface WorkOrderFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onAdd?: (data: WorkOrder) => Promise<{ message: string }>
  onEdit?: (id: string, data: WorkOrder) => Promise<{ message: string }>
  isEditMode?: boolean
  initialData?: WorkOrder | null
  formData: WorkOrder
  formErrors: Record<string, string>
  handleFieldChange: (name: string, value: string) => void
  handleSubmitForm: (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: WorkOrder | null,
    onSuccess: (message: string) => void,
    onError: (message: string) => void,
    onAdd?: (data: WorkOrder) => Promise<{ message: string }>,
    onEdit?: (id: string, data: WorkOrder) => Promise<{ message: string }>,
  ) => void
  isSubmitting: boolean
  installations?: any[]
  loadingInstallations?: boolean
  errorLoadingInstallations?: string | null
}

const WorkOrderForm = ({
  onCancel,
  onSuccess,
  onError,
  onAdd,
  onEdit,
  isEditMode = false,
  initialData,
  formData,
  formErrors,
  handleFieldChange,
  handleSubmitForm,
  isSubmitting,
  installations = [],
  loadingInstallations = false,
  errorLoadingInstallations = null,
  setFormErrors,
}: WorkOrderFormProps & { setFormErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void }) => {
  const { t, i18n } = useTranslation()
  const { dark } = useTheme()
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)

  const workTypes = [
    { value: "mantenimiento", label: t('workOrders.maintenance') },
    { value: "reparacion", label: t('workOrders.repair') },
    { value: "instalacion", label: t('workOrders.installation') },
    { value: "inspeccion", label: t('workOrders.inspection') },
    { value: "otro", label: t('workOrders.other') },
  ]

  const priorities = [
    { value: "baja", label: t('workOrders.low') },
    { value: "media", label: t('workOrders.medium') },
    { value: "alta", label: t('workOrders.high') },
    { value: "critica", label: t('workOrders.critical') },
  ]

  const handleFieldBlur = async (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    // Validar solo el campo que perdió el foco
    const value = formData[fieldName as keyof typeof formData]
    const result = await validateWorkOrderField(fieldName, value, formData, t)
    handleSetFieldError(fieldName, result.isValid ? '' : result.error)
  }

  const handleSetFieldError = (fieldName: string, error: string) => {
    setFormErrors((prev: Record<string, string>) => ({ ...prev, [fieldName]: error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched: Record<string, boolean> = {}
    Object.keys(formData).forEach((name) => { allTouched[name] = true })
    setTouchedFields(allTouched)
    // Validar todo el formulario
    const validation = await validateWorkOrderForm(formData, t)
    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, error]) => {
        handleSetFieldError(field, error)
      })
      return
    }
    // ... aquí llamar a handleSubmitForm original ...
    handleSubmitForm(e, isEditMode, initialData, onSuccess, onError, onAdd, onEdit)
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  const formatDateForInput = (date: Date | string) => {
    if (!date) return ""
    const d = new Date(date)
    if (isNaN(d.getTime())) return ""
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // Utilidad para formatear YYYY-MM-DD a DD/MM/YYYY
  const formatLocalDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  const isFormValid = useMemo(() => {
    const hasTitulo = formData.titulo?.trim().length > 0
    const hasDescripcion = formData.descripcion?.trim().length > 0
    const hasInstalacion = formData.instalacionId?.trim().length > 0
    const hasFecha = formData.fechaProgramada !== null && formData.fechaProgramada !== undefined
    const hasHora = formData.horaProgramada?.trim().length > 0
    const hasNoErrors = !Object.values(formErrors).some((error) => error && error.trim().length > 0)
    return hasTitulo && hasDescripcion && hasInstalacion && hasFecha && hasHora && hasNoErrors
  }, [formData, formErrors])

  const isFieldDisabled = (fieldName: string) => {
    return (
      isSubmitting ||
      (isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || "")) ||
      (isEditMode && fieldName === "instalacionId" && ["asignada"].includes(initialData?.estado || ""))
    )
  }

  // Buscar la instalación seleccionada basada en el instalacionId del formData
  const selectedInstallation = useMemo(() => {
    if (!formData.instalacionId || installations.length === 0) {
      return null
    }
    return installations.find((inst) => inst._id === formData.instalacionId) || null
  }, [formData.instalacionId, installations])

  // Manejar el cambio en el select de instalación
  const handleInstallationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    handleFieldChange("instalacionId", selectedId)

    // Si se selecciona una instalación, también actualizar el objeto instalacion
    if (selectedId) {
      const selectedInst = installations.find((inst) => inst._id === selectedId)
      if (selectedInst) {
        handleFieldChange("instalacion", selectedInst)
      }
    } else {
      // Si se deselecciona, limpiar el objeto instalacion
      handleFieldChange("instalacion", null)
    }
  }

  const handleOpenDatePicker = () => {
    setIsDatePickerOpen(true)
  }

  const handleDateSelect = (date: string) => {
    // Guardar la fecha como string local 'YYYY-MM-DD' para evitar desfase de zona horaria
    handleFieldChange("fechaProgramada", date)
  }

  const handleOpenTimePicker = () => {
    setIsTimePickerOpen(true)
  }

  const handleTimeSelect = (time: string) => {
    handleFieldChange("horaProgramada", time)
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={styles.form}
      >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.title')} *</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo || ""}
            onChange={(e) => handleFieldChange("titulo", e.target.value)}
            onBlur={() => handleFieldBlur("titulo")}
            disabled={isFieldDisabled("titulo")}
            className={showError("titulo") ? styles.errorInput : "formInput"}
            placeholder={t('workOrders.titlePlaceholder')}
          />
          {showError("titulo") && <p className={styles.inputError}>{formErrors["titulo"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.description')} *</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isFieldDisabled("descripcion")}
            className={showError("descripcion") ? styles.errorInput : "formInput"}
            rows={4}
            placeholder={t('workOrders.descriptionPlaceholder')}
          />
          {showError("descripcion") && <p className={styles.inputError}>{formErrors["descripcion"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.installation')} *</label>
          {loadingInstallations ? (
            <p>{t('workOrders.loadingInstallations')}</p>
          ) : errorLoadingInstallations ? (
            <p className={styles.inputError}>{errorLoadingInstallations}</p>
          ) : (
            <>
              <HybridSelect
                name="instalacionId"
                value={formData.instalacionId || ""}
                onChange={(value) => {
                  handleFieldChange("instalacionId", value);
                  // Si se selecciona una instalación, también actualizar el objeto instalacion
                  if (value) {
                    const selectedInst = installations.find((inst) => inst._id === value);
                    if (selectedInst) {
                      handleFieldChange("instalacion", selectedInst);
                    }
                  } else {
                    // Si se deselecciona, limpiar el objeto instalacion
                    handleFieldChange("instalacion", null);
                  }
                }}
                onBlur={() => handleFieldBlur("instalacionId")}
                disabled={isFieldDisabled("instalacionId")}
                options={[
                  { value: "", label: t('workOrders.selectInstallation') },
                  ...installations.map(inst => ({
                    value: inst._id,
                    label: `${inst.company} - ${inst.address} ${inst.city ? `(${inst.city})` : ""}`
                  }))
                ]}
                placeholder={t('workOrders.selectInstallation')}
                error={!!showError("instalacionId")}
              />

              {selectedInstallation && (
                <div className={styles.selectedInstallationDetail}>
                  <strong>{t('workOrders.selectedInstallation')}</strong> {selectedInstallation.company}
                  <br />
                  <strong>{t('workOrders.address')}</strong> {selectedInstallation.address}, {selectedInstallation.city}
                </div>
              )}
            </>
          )}
          {showError("instalacionId") && <p className={styles.inputError}>{formErrors["instalacionId"]}</p>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.workType')} *</label>
            <HybridSelect
              name="tipoTrabajo"
              value={formData.tipoTrabajo || ""}
              onChange={(value) => handleFieldChange("tipoTrabajo", value)}
              onBlur={() => handleFieldBlur("tipoTrabajo")}
              disabled={isFieldDisabled("tipoTrabajo")}
              options={[
                { value: "", label: t('workOrders.selectWorkType') },
                ...workTypes
              ]}
              placeholder={t('workOrders.selectWorkType')}
              error={!!showError("tipoTrabajo")}
            />
            {showError("tipoTrabajo") && <p className={styles.inputError}>{formErrors["tipoTrabajo"]}</p>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.priority')} *</label>
            <HybridSelect
              name="prioridad"
              value={formData.prioridad || "media"}
              onChange={(value) => handleFieldChange("prioridad", value)}
              onBlur={() => handleFieldBlur("prioridad")}
              disabled={isFieldDisabled("prioridad")}
              options={[
                { value: "", label: t('workOrders.selectPriority') },
                ...priorities
              ]}
              placeholder={t('workOrders.selectPriority')}
              error={!!showError("prioridad")}
            />
            {showError("prioridad") && <p className={styles.inputError}>{formErrors["prioridad"]}</p>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.scheduledDate')} *</label>
            <button
              type="button"
              onClick={handleOpenDatePicker}
              disabled={isFieldDisabled("fechaProgramada")}
              className={showError("fechaProgramada") ? styles.errorInput : styles.customDateButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.dateButtonIcon}>
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {formData.fechaProgramada ? (
                typeof formData.fechaProgramada === 'string'
                  ? formatLocalDate(formData.fechaProgramada)
                  : formatLocalDate(formData.fechaProgramada.toISOString().split('T')[0])
              ) : (
                t('workOrders.selectDate')
              )}
            </button>
            {isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || "") && (
              <p className={styles.warningMessage}>
                No se puede editar una orden {initialData?.estado.replace("_", " ")}
              </p>
            )}
            {showError("fechaProgramada") && <p className={styles.inputError}>{formErrors["fechaProgramada"]}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.scheduledTime')} *</label>
            <button
              type="button"
              onClick={handleOpenTimePicker}
              disabled={isFieldDisabled("horaProgramada")}
              className={showError("horaProgramada") ? styles.errorInput : styles.customDateButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.dateButtonIcon}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formData.horaProgramada || t('workOrders.selectTime')}
            </button>
            {showError("horaProgramada") && <p className={styles.inputError}>{formErrors["horaProgramada"]}</p>}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.observations')}</label>
          <textarea
            name="observaciones"
            value={formData.observaciones || ""}
            onChange={(e) => handleFieldChange("observaciones", e.target.value)}
            disabled={isSubmitting}
            rows={2}
            placeholder={t('workOrders.observationsPlaceholder')}
            className="formInput"
          />
        </div>

        <div className={formButtonStyles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('workOrders.cancel')}
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || ""))
            }
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('workOrders.saving') : isEditMode ? t('common.update') : t('common.save')}
          </button>
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
      </div>
    </form>

    <DatePickerModal
      isOpen={isDatePickerOpen}
      onRequestClose={() => setIsDatePickerOpen(false)}
      onDateSelect={handleDateSelect}
      selectedDate={formData.fechaProgramada ? formatDateForInput(formData.fechaProgramada) : undefined}
      title={t('workOrders.scheduledDate')}
    />

    <TimePickerModal
      isOpen={isTimePickerOpen}
      onRequestClose={() => setIsTimePickerOpen(false)}
      onTimeSelect={handleTimeSelect}
      selectedTime={formData.horaProgramada}
      title={t('workOrders.scheduledTime')}
    />

    </>
  )
}

export default WorkOrderForm;

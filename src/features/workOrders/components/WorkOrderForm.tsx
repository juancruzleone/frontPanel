import type React from "react"
import { useState, useMemo } from "react"
import type { WorkOrder } from "../hooks/useWorkOrders"
import styles from "../styles/workOrderForm.module.css"
import { useTranslation } from "react-i18next"

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
}: WorkOrderFormProps) => {
  const { t } = useTranslation()
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const workTypes = [
    { value: "mantenimiento", label: t('workOrders.form.maintenance') },
    { value: "reparacion", label: t('workOrders.form.repair') },
    { value: "instalacion", label: t('workOrders.form.installation') },
    { value: "inspeccion", label: t('workOrders.form.inspection') },
    { value: "otro", label: t('workOrders.form.other') },
  ]

  const priorities = [
    { value: "baja", label: t('workOrders.form.low') },
    { value: "media", label: t('workOrders.form.medium') },
    { value: "alta", label: t('workOrders.form.high') },
    { value: "critica", label: t('workOrders.form.critical') },
  ]

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    }
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

  return (
    <form
      onSubmit={(e) => handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onError, onAdd, onEdit)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.form.title')} *</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo || ""}
            onChange={(e) => handleFieldChange("titulo", e.target.value)}
            onBlur={() => handleFieldBlur("titulo")}
            disabled={isFieldDisabled("titulo")}
            className={showError("titulo") ? styles.errorInput : "formInput"}
            placeholder={t('workOrders.form.titlePlaceholder')}
          />
          {showError("titulo") && <p className={styles.inputError}>{formErrors["titulo"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.form.description')} *</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isFieldDisabled("descripcion")}
            className={showError("descripcion") ? styles.errorInput : "formInput"}
            rows={4}
            placeholder={t('workOrders.form.descriptionPlaceholder')}
          />
          {showError("descripcion") && <p className={styles.inputError}>{formErrors["descripcion"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">{t('workOrders.form.installation')} *</label>
          {loadingInstallations ? (
            <p>{t('workOrders.form.loadingInstallations')}</p>
          ) : errorLoadingInstallations ? (
            <p className={styles.inputError}>{errorLoadingInstallations}</p>
          ) : (
            <>
              <select
                name="instalacionId"
                value={formData.instalacionId || ""}
                onChange={handleInstallationChange}
                onBlur={() => handleFieldBlur("instalacionId")}
                disabled={isFieldDisabled("instalacionId")}
                className={showError("instalacionId") ? styles.errorInput : "formInput"}
              >
                <option value="">{t('workOrders.form.selectInstallation')}</option>
                {installations.map((inst) => (
                  <option key={inst._id} value={inst._id}>
                    {inst.company} - {inst.address} {inst.city ? `(${inst.city})` : ""}
                  </option>
                ))}
              </select>

              {selectedInstallation && (
                <div className={styles.selectedInstallationDetail}>
                  <strong>{t('workOrders.form.selectedInstallation')}</strong> {selectedInstallation.company}
                  <br />
                  <strong>{t('workOrders.form.address')}</strong> {selectedInstallation.address}, {selectedInstallation.city}
                </div>
              )}
            </>
          )}
          {showError("instalacionId") && <p className={styles.inputError}>{formErrors["instalacionId"]}</p>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.form.workType')}</label>
            <select
              name="tipoTrabajo"
              value={formData.tipoTrabajo || "mantenimiento"}
              onChange={(e) => handleFieldChange("tipoTrabajo", e.target.value)}
              onBlur={() => handleFieldBlur("tipoTrabajo")}
              disabled={isFieldDisabled("tipoTrabajo")}
              className={showError("tipoTrabajo") ? styles.errorInput : "formInput"}
            >
              {workTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {showError("tipoTrabajo") && <p className={styles.inputError}>{formErrors["tipoTrabajo"]}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.form.priority')}</label>
            <select
              name="prioridad"
              value={formData.prioridad || "media"}
              onChange={(e) => handleFieldChange("prioridad", e.target.value)}
              onBlur={() => handleFieldBlur("prioridad")}
              disabled={isFieldDisabled("prioridad")}
              className={showError("prioridad") ? styles.errorInput : "formInput"}
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            {showError("prioridad") && <p className={styles.inputError}>{formErrors["prioridad"]}</p>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.form.scheduledDate')} *</label>
            <input
              type="date"
              name="fechaProgramada"
              value={formatDateForInput(formData.fechaProgramada)}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null
                handleFieldChange("fechaProgramada", date?.toISOString() || "")
              }}
              onBlur={() => handleFieldBlur("fechaProgramada")}
              disabled={isFieldDisabled("fechaProgramada")}
              className={showError("fechaProgramada") ? styles.errorInput : "formInput"}
            />
            {isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || "") && (
              <p className={styles.warningMessage}>
                No se puede editar una orden {initialData?.estado.replace("_", " ")}
              </p>
            )}
            {showError("fechaProgramada") && <p className={styles.inputError}>{formErrors["fechaProgramada"]}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className="formLabel">{t('workOrders.form.scheduledTime')} *</label>
            <input
              type="time"
              name="horaProgramada"
              value={formData.horaProgramada || ""}
              onChange={(e) => handleFieldChange("horaProgramada", e.target.value)}
              onBlur={() => handleFieldBlur("horaProgramada")}
              disabled={isFieldDisabled("horaProgramada")}
              className={showError("horaProgramada") ? styles.errorInput : "formInput"}
            />
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
            placeholder={t('workOrders.form.observationsPlaceholder')}
            className="formInput"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
            {t('workOrders.form.cancel')}
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !isFormValid ||
              (isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || ""))
            }
            className={styles.submitButton}
            title={!isFormValid ? t('workOrders.form.completeRequiredFields') : ""}
          >
            {isSubmitting ? t('workOrders.form.saving') : isEditMode ? t('workOrders.form.update') : t('workOrders.form.save')}
          </button>
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
      </div>
    </form>
  )
}

export default WorkOrderForm

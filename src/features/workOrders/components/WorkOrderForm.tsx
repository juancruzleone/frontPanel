import type React from "react"
import { useState, useMemo } from "react"
import type { WorkOrder } from "../hooks/useWorkOrders"
import styles from "../styles/workOrderForm.module.css"

interface WorkOrderFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const workTypes = [
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "reparacion", label: "Reparación" },
    { value: "instalacion", label: "Instalación" },
    { value: "inspeccion", label: "Inspección" },
    { value: "otro", label: "Otro" },
  ]

  const priorities = [
    { value: "baja", label: "Baja" },
    { value: "media", label: "Media" },
    { value: "alta", label: "Alta" },
    { value: "critica", label: "Crítica" },
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
      onSubmit={(e) => handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onAdd, onEdit)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label className="formLabel">Título *</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo || ""}
            onChange={(e) => handleFieldChange("titulo", e.target.value)}
            onBlur={() => handleFieldBlur("titulo")}
            disabled={isFieldDisabled("titulo")}
            className={showError("titulo") ? styles.errorInput : "formInput"}
            placeholder="Ingrese el título de la orden de trabajo"
          />
          {showError("titulo") && <p className={styles.inputError}>{formErrors["titulo"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">Descripción *</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isFieldDisabled("descripcion")}
            className={showError("descripcion") ? styles.errorInput : "formInput"}
            rows={4}
            placeholder="Describa el trabajo a realizar"
          />
          {showError("descripcion") && <p className={styles.inputError}>{formErrors["descripcion"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className="formLabel">Instalación *</label>
          {loadingInstallations ? (
            <p>Cargando instalaciones...</p>
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
                <option value="">Seleccione una instalación</option>
                {installations.map((inst) => (
                  <option key={inst._id} value={inst._id}>
                    {inst.company} - {inst.address} {inst.city ? `(${inst.city})` : ""}
                  </option>
                ))}
              </select>

              {selectedInstallation && (
                <div className={styles.selectedInstallationDetail}>
                  <strong>Instalación seleccionada:</strong> {selectedInstallation.company}
                  <br />
                  <strong>Dirección:</strong> {selectedInstallation.address}, {selectedInstallation.city}
                </div>
              )}
            </>
          )}
          {showError("instalacionId") && <p className={styles.inputError}>{formErrors["instalacionId"]}</p>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className="formLabel">Tipo de trabajo</label>
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
            <label className="formLabel">Prioridad</label>
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
            <label className="formLabel">Fecha programada *</label>
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
            <label className="formLabel">Hora programada *</label>
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
          <label className="formLabel">Observaciones</label>
          <textarea
            name="observaciones"
            value={formData.observaciones || ""}
            onChange={(e) => handleFieldChange("observaciones", e.target.value)}
            disabled={isSubmitting}
            rows={2}
            placeholder="Observaciones adicionales (opcional)"
            className="formInput"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !isFormValid ||
              (isEditMode && ["completada", "en_progreso"].includes(initialData?.estado || ""))
            }
            className={styles.submitButton}
            title={!isFormValid ? "Complete todos los campos obligatorios" : ""}
          >
            {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
          </button>
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
      </div>
    </form>
  )
}

export default WorkOrderForm

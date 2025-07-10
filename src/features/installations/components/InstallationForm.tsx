import type React from "react"

import { useState } from "react"
import type { Installation } from "../hooks/useInstallations"
import useInstallationTypes from "../hooks/useInstallationTypes"
import styles from "../styles/installationForm.module.css"

interface InstallationFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAdd?: (data: Installation) => Promise<{ message: string }>
  onEdit?: (id: string, data: Installation) => Promise<{ message: string }>
  isEditMode?: boolean
  initialData?: Installation | null
  formData: Installation
  formErrors: Record<string, string>
  handleFieldChange: (name: string, value: string) => void
  handleSubmitForm: (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: Installation | null,
    onSuccess: (message: string) => void,
    onAdd?: (data: Installation) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Installation) => Promise<{ message: string }>,
  ) => void
  isSubmitting: boolean
}

const InstallationForm = ({
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
}: InstallationFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const { installationTypes, loading: loadingTypes } = useInstallationTypes()

  const fields = [
    { name: "company", label: "Empresa", type: "text" },
    { name: "address", label: "Dirección", type: "text" },
    { name: "installationType", label: "Tipo de instalación", type: "select" },
    { name: "floorSector", label: "Piso/Sector", type: "text" },
    { name: "postalCode", label: "Código Postal", type: "text" },
    { name: "city", label: "Ciudad", type: "text" },
    { name: "province", label: "Provincia", type: "text" },
  ]

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    }
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  const renderField = (field: { name: string; label: string; type: string }) => {
    if (field.type === "select" && field.name === "installationType") {
      return (
        <select
          name={field.name}
          value={formData[field.name] || ""}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          onBlur={() => handleFieldBlur(field.name)}
          disabled={isSubmitting || loadingTypes}
          className={showError(field.name) ? styles.errorInput : ""}
        >
          <option value="">Seleccionar tipo de instalación</option>
          {installationTypes.map((type) => (
            <option key={type._id} value={type.nombre}>
              {type.nombre}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type="text"
        name={field.name}
        value={formData[field.name] || ""}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        onBlur={() => handleFieldBlur(field.name)}
        disabled={isSubmitting}
        className={showError(field.name) ? styles.errorInput : ""}
      />
    )
  }

  return (
    <form
      onSubmit={(e) => handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onAdd, onEdit)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        {/* Error general */}
        {formErrors.general && <div className={styles.generalError}>{formErrors.general}</div>}

        {/* Sección: Información de la Empresa */}
        <h3 className={styles.sectionTitle}>Información de la Empresa</h3>
        
        {fields.slice(0, 2).map((field) => (
          <div className={styles.formGroup} key={field.name}>
            <label>{field.label} *</label>
            {renderField(field)}
            {showError(field.name) && <p className={styles.inputError}>{formErrors[field.name]}</p>}
          </div>
        ))}

        {/* Sección: Configuración de la Instalación */}
        <h3 className={styles.sectionTitle}>Configuración de la Instalación</h3>
        
        {fields.slice(2, 4).map((field) => (
          <div className={styles.formGroup} key={field.name}>
            <label>{field.label} *</label>
            {renderField(field)}
            {showError(field.name) && <p className={styles.inputError}>{formErrors[field.name]}</p>}
          </div>
        ))}

        {/* Sección: Ubicación */}
        <h3 className={styles.sectionTitle}>Ubicación</h3>
        
        {fields.slice(4).map((field) => (
          <div className={styles.formGroup} key={field.name}>
            <label>{field.label} *</label>
            {renderField(field)}
            {showError(field.name) && <p className={styles.inputError}>{formErrors[field.name]}</p>}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting || loadingTypes} className={styles.submitButton}>
          {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
        </button>
      </div>
    </form>
  )
}

export default InstallationForm

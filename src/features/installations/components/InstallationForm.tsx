import type React from "react"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Installation } from "../hooks/useInstallations"
import useInstallationTypes from "../hooks/useInstallationTypes"
import styles from "../styles/installationForm.module.css"

interface InstallationFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
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
    onError: (message: string) => void,
    onAdd?: (data: Installation) => Promise<{ message: string }>,
    onEdit?: (id: string, data: Installation) => Promise<{ message: string }>,
  ) => void
  isSubmitting: boolean
}

const InstallationForm = ({
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
}: InstallationFormProps) => {
  const { t } = useTranslation()
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const { installationTypes, loading: loadingTypes } = useInstallationTypes()

  const fields = [
    { name: "company", label: t('installations.company'), type: "text" },
    { name: "address", label: t('installations.address'), type: "text" },
    { name: "installationType", label: t('installations.installationType'), type: "select" },
    { name: "floorSector", label: t('installations.floorSector'), type: "text" },
    { name: "postalCode", label: t('installations.postalCode'), type: "text" },
    { name: "city", label: t('installations.city'), type: "text" },
    { name: "province", label: t('installations.province'), type: "text" },
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
          <option value="">{t('installations.selectInstallationType')}</option>
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
      onSubmit={(e) => handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onError, onAdd, onEdit)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        {/* Error general */}
        {formErrors.general && <div className={styles.generalError}>{formErrors.general}</div>}

        {/* Sección: Información de la Empresa */}
        <h3 className={styles.sectionTitle}>{t('installations.companyInfo')}</h3>
        
        {fields.slice(0, 2).map((field) => (
          <div className={styles.formGroup} key={field.name}>
            <label>{field.label} *</label>
            {renderField(field)}
            {showError(field.name) && <p className={styles.inputError}>{formErrors[field.name]}</p>}
          </div>
        ))}

        {/* Sección: Configuración de la Instalación */}
        <h3 className={styles.sectionTitle}>{t('installations.installationConfig')}</h3>
        
        {fields.slice(2, 4).map((field) => (
          <div className={styles.formGroup} key={field.name}>
            <label>{field.label} *</label>
            {renderField(field)}
            {showError(field.name) && <p className={styles.inputError}>{formErrors[field.name]}</p>}
          </div>
        ))}

        {/* Sección: Ubicación */}
        <h3 className={styles.sectionTitle}>{t('installations.location')}</h3>
        
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
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting || loadingTypes} className={styles.submitButton}>
          {isSubmitting ? t('installations.saving') : isEditMode ? t('common.update') : t('common.create')}
        </button>
      </div>
    </form>
  )
}

export default InstallationForm

import type React from "react"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"
import { useTheme } from "../../../shared/hooks/useTheme"
import type { Installation } from "../hooks/useInstallations"
import useInstallationTypes from "../hooks/useInstallationTypes"
import HybridSelect from "../../workOrders/components/HybridSelect"
import styles from "../styles/installationForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { validateInstallationForm, validateInstallationField } from '../validators/installationsValidations';

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
  setFormErrors: (errors: Record<string, string>) => void
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
  setFormErrors,
}: InstallationFormProps) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const { installationTypes, loading: loadingTypes } = useInstallationTypes()

  const fields = [
    { name: "company", label: t('installations.company'), type: "text", placeholder: t('installations.companyPlaceholder') },
    { name: "address", label: t('installations.address'), type: "text", placeholder: t('installations.addressPlaceholder') },
    { name: "installationType", label: t('installations.installationType'), type: "select" },
    { name: "floorSector", label: t('installations.floorSector'), type: "text", placeholder: t('installations.floorSectorPlaceholder') },
    { name: "postalCode", label: t('installations.postalCode'), type: "text", placeholder: t('installations.postalCodePlaceholder') },
    { name: "city", label: t('installations.city'), type: "text", placeholder: t('installations.cityPlaceholder') },
    { name: "province", label: t('installations.province'), type: "text", placeholder: t('installations.provincePlaceholder') },
  ]

  const handleFieldBlur = async (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    // Validar solo el campo que perdió el foco
    const value = formData[fieldName as keyof typeof formData]
    const result = await validateInstallationField(fieldName, value, formData, t)
    handleSetFieldError(fieldName, result.isValid ? '' : result.error)
  }

  const handleSetFieldError = (fieldName: string, error: string) => {
    // setFormErrors espera un objeto, no una función updater
    setFormErrors({ ...formErrors, [fieldName]: error })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched: Record<string, boolean> = {}
    Object.keys(formData).forEach((name) => { allTouched[name] = true })
    setTouchedFields(allTouched)
    // Validar todo el formulario
    const validation = await validateInstallationForm(formData, t)
    if (!validation.isValid) {
      // Mostrar todos los errores de una vez
      setFormErrors(validation.errors)
      return
    }
    // ... aquí llamar a handleSubmitForm original ...
    handleSubmitForm(e, isEditMode, initialData, onSuccess, onError, onAdd, onEdit)
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  const renderField = (field: { name: string; label: string; type: string; placeholder?: string }) => {
    if (field.type === "select" && field.name === "installationType") {
      const installationTypeOptions = [
        { value: "", label: t('installations.selectInstallationType') },
        ...installationTypes.map((type) => ({
          value: type.nombre,
          label: type.nombre
        }))
      ];

      return (
        <HybridSelect
          name={field.name}
          value={formData[field.name] || ""}
          onChange={(value) => handleFieldChange(field.name, value)}
          onBlur={() => handleFieldBlur(field.name)}
          disabled={isSubmitting || loadingTypes}
          options={installationTypeOptions}
          placeholder={t('installations.selectInstallationType')}
          error={!!showError(field.name)}
        />
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
        placeholder={field.placeholder || ""}
      />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
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

        <div className={formButtonStyles.actions}>
          <button type="submit" disabled={isSubmitting || loadingTypes} className={formButtonStyles.submitButton}>
            {isSubmitting ? t('common.saving') : isEditMode ? t('common.update') : t('common.create')}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default InstallationForm

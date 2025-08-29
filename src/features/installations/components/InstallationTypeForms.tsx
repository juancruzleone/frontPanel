import type React from "react"
import { useState, useMemo } from "react"
import styles from "../styles/installationForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import formCheckboxStyles from "../../../shared/components/Buttons/formCheckboxes.module.css"
import { useTranslation } from "react-i18next"

export type InstallationTypeFormData = {
  nombre: string
  descripcion: string
  activo: boolean
}

interface InstallationTypeFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onCreate: (data: any) => Promise<{ message: string }>
}

const InstallationTypeForms = ({ onCancel, onSuccess, onCreate }: InstallationTypeFormProps) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<InstallationTypeFormData>({
    nombre: "",
    descripcion: "",
    activo: true,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (data: InstallationTypeFormData): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!data.nombre.trim()) {
      errors.nombre = t('installations.typeNameRequired')
    } else if (data.nombre.trim().length < 2) {
      errors.nombre = t('installations.typeNameMin')
    } else if (data.nombre.trim().length > 100) {
      errors.nombre = t('installations.typeNameMax')
    }

    if (data.descripcion && data.descripcion.length > 500) {
      errors.descripcion = t('installations.typeDescriptionMax')
    }

    return errors
  }

  const handleFieldChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    // Validar por campo
    const value = formData[fieldName as keyof typeof formData]
    const errors = validateForm({ ...formData, [fieldName]: value })
    setFormErrors((prev) => ({ ...prev, [fieldName]: errors[fieldName] || "" }))
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  // Validación para habilitar/deshabilitar el botón
  const isFormValid = useMemo(() => {
    const hasNombre = formData.nombre.trim().length > 0
    const hasNoErrors = !Object.values(formErrors).some((error) => error && error.trim().length > 0)
    return hasNombre && hasNoErrors
  }, [formData.nombre, formErrors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Marcar todos los campos como tocados para mostrar errores
    setTouchedFields({ nombre: true, descripcion: true, activo: true })
    // Validar formulario
    const errors = validateForm(formData)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }
    setIsSubmitting(true)
    try {
      const result = await onCreate({
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        activo: formData.activo,
      })
      onSuccess(result.message)
    } catch (err: any) {
      console.error("Error al crear tipo de instalación:", err)
      setFormErrors({
        submit: err.message || "Error al crear el tipo de instalación",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>{t('installations.typeName')} *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder={t('installations.typeNamePlaceholder')}
          />
          {showError("nombre") && <p className={styles.inputError}>{formErrors["nombre"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>{t('installations.typeDescription')}</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
            placeholder={t('installations.typeDescriptionPlaceholder')}
          />
          {showError("descripcion") && <p className={styles.inputError}>{formErrors["descripcion"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className={formCheckboxStyles.checkboxLabel}>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={(e) => handleFieldChange("activo", e.target.checked)}
              disabled={isSubmitting}
              className={formCheckboxStyles.checkboxInput}
            />
            <span className={formCheckboxStyles.checkboxCustom}></span>
            {t('installations.active')}
          </label>
        </div>

        <div className={formButtonStyles.actions}>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
            title={Object.keys(formErrors).length > 0 ? t('installations.completeAllFields') : ""}
          >
            {isSubmitting ? t('common.saving') : t('common.create')}
          </button>
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
      </div>
    </form>
  )
}

export default InstallationTypeForms

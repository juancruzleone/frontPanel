import React, { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"
import { useTheme } from "../../../shared/hooks/useTheme"
import HybridSelect from "../../workOrders/components/HybridSelect"
import styles from "../styles/formTemplateForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import formCheckboxStyles from "../../../shared/components/Buttons/formCheckboxes.module.css"
import type { FormTemplate, FormField } from "../hooks/useForms"
import { validateFormTemplate, validateFormField } from "../validators/formValidations"

interface FormTemplateFormProps {
  onCancel: () => void
  onSubmitSuccess: (data: FormTemplate) => Promise<void>
  onSubmitError: (message: string) => void
  isEditMode: boolean
  initialData: FormTemplate | null
  categories: string[]
}

const fieldTypes = ["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"]

const FormTemplateForm = ({
  onCancel,
  onSubmitSuccess,
  onSubmitError,
  isEditMode,
  initialData,
  categories,
}: FormTemplateFormProps) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const [formData, setFormData] = useState<Omit<FormTemplate, "_id">>({
    nombre: "",
    categoria: "",
    descripcion: "",
    campos: [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newField, setNewField] = useState<FormField>({
    name: "",
    type: "text",
    label: "",
    required: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre || "",
        categoria: initialData.categoria || "",
        descripcion: initialData.descripcion || "",
        campos: initialData.campos || [],
      })
      // Limpiar errores cuando se carga nueva data
      setErrors({})
      setTouchedFields({})
    }
  }, [initialData])

  // Validación mejorada para bloquear el botón
  const isFormValid = useMemo(() => {
    // Verificar campos obligatorios
    const hasNombre = formData.nombre.trim().length > 0
    const hasCategoria = formData.categoria.trim().length > 0
    const hasCampos = formData.campos.length > 0

    // Verificar si hay errores reales (no strings vacíos)
    const hasRealErrors = Object.values(errors).some((error) => error && error.trim().length > 0)

    const isValid = hasNombre && hasCategoria && hasCampos && !hasRealErrors

    return isValid
  }, [formData.nombre, formData.categoria, formData.campos.length, errors])

  // Validación para el botón de agregar campo
  const canAddField = useMemo(() => {
    const hasFieldName = newField.name.trim().length > 0
    const hasFieldLabel = newField.label.trim().length > 0
    const hasNoFieldErrors = !Object.values(fieldErrors).some((error) => error && error.trim().length > 0)

    return hasFieldName && hasFieldLabel && hasNoFieldErrors
  }, [newField.name, newField.label, fieldErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Limpiar error inmediatamente cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleFieldBlur = async (fieldName: string) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    // Validar solo el campo que perdió el foco
    const fieldValue = formData[fieldName as keyof Omit<FormTemplate, "_id">]
    const result = await validateFormField(fieldName, fieldValue, formData, t)
    setErrors((prev) => ({ ...prev, [fieldName]: result.isValid ? "" : result.error }))
  }

  const validateForm = async (): Promise<boolean> => {
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched: Record<string, boolean> = {}
    Object.keys(formData).forEach((name) => { allTouched[name] = true })
    setTouchedFields(allTouched)
    const validation = await validateFormTemplate(formData, t)
    setErrors(validation.errors)
    return validation.isValid
  }

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    setNewField((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))

    // Limpiar errores del campo inmediatamente
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const options = e.target.value.split("\n").filter((opt) => opt.trim() !== "")
    setNewField((prev) => ({
      ...prev,
      options,
    }))

    // Limpiar error de opciones si existe
    if (fieldErrors.options) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.options
        return newErrors
      })
    }
  }

  const validateNewField = (field: FormField): boolean => {
    const newErrors: Record<string, string> = {}

    if (!field.name.trim()) {
      newErrors.name = t('forms.fieldNameRequired')
    } else if (!/^[a-zA-Z0-9_]+$/.test(field.name)) {
      newErrors.name = t('forms.fieldNameInvalid')
    } else if (formData.campos.some((existingField) => existingField.name === field.name)) {
      newErrors.name = t('forms.fieldNameExists')
    }

    if (!field.label.trim()) {
      newErrors.label = t('forms.fieldLabelRequired')
    }

    if ((field.type === "select" || field.type === "radio") && (!field.options || field.options.length === 0)) {
      newErrors.options = t('forms.fieldOptionsRequired')
    }

    setFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addField = () => {
    if (!validateNewField(newField)) return

    setFormData((prev) => ({
      ...prev,
      campos: [...prev.campos, { ...newField }],
    }))

    // Limpiar el formulario de nuevo campo
    setNewField({
      name: "",
      type: "text",
      label: "",
      required: false,
    })

    // Limpiar errores de campo
    setFieldErrors({})
  }

  const removeField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      campos: prev.campos.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación final antes de enviar
    if (!(await validateForm())) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitSuccess(formData)
    } catch (err: any) {
      console.error("Error al guardar plantilla:", err)
      onSubmitError(err.message || "Error al guardar la plantilla. Por favor intente nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && errors[fieldName]

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.basicInfoSection}>
          <div className={styles.formGroup}>
            <label>{t('forms.templateName')} *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("nombre")}
              disabled={isSubmitting}
              className={showError("nombre") ? styles.errorInput : ""}
              placeholder={t('forms.enterTemplateName')}
            />
            {showError("nombre") && <span className={styles.inputError}>{errors.nombre}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>{t('forms.templateCategory')} *</label>
            <HybridSelect
              name="categoria"
              value={formData.categoria}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, categoria: value }));
                if (errors.categoria) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.categoria;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => handleFieldBlur("categoria")}
              disabled={isSubmitting}
              options={[
                { value: "", label: t('forms.selectCategory') },
                ...categories.map((cat) => ({
                  value: cat,
                  label: cat
                }))
              ]}
              placeholder={t('forms.selectCategory')}
              error={!!showError("categoria")}
            />
            {showError("categoria") && <span className={styles.inputError}>{errors.categoria}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>{t('forms.templateDescription')} ({t('forms.optional')})</label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("descripcion")}
              disabled={isSubmitting}
              rows={3}
              placeholder={t('forms.enterTemplateDescription')}
            />
          </div>
        </div>

        <div className={styles.fieldsSection}>
          <h3 className={styles.sectionTitle}>{t('forms.formFields')} *</h3>
          {formData.campos.length === 0 && touchedFields.campos && (
            <span className={styles.inputError}>{t('forms.addAtLeastOneField')}</span>
          )}

          <div className={styles.fieldsList}>
            {formData.campos.map((field, index) => (
              <div key={index} className={styles.fieldItem}>
                <div className={styles.fieldHeader}>
                  <div className={styles.fieldInfo}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <span className={styles.fieldType}>({t(`forms.${field.type}Field`)})</span>
                    {field.required && <span className={styles.requiredBadge}>{t('forms.required')}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={isSubmitting}
                    className={styles.removeFieldButton}
                    aria-label={t('forms.removeField')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {field.options && (
                  <div className={styles.fieldOptions}>
                    <strong>{t('forms.options')}:</strong> {field.options.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.addFieldForm}>
            <h4 className={styles.addFieldTitle}>{t('forms.addNewField')}</h4>

            <div className={styles.fieldFormRow}>
              <div className={styles.fieldFormGroup}>
                <label>{t('forms.fieldName')} *</label>
                <input
                  type="text"
                  name="name"
                  value={newField.name}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={fieldErrors.name ? styles.errorInput : ""}
                  placeholder={t('forms.fieldNamePlaceholder')}
                />
                {fieldErrors.name && <span className={styles.inputError}>{fieldErrors.name}</span>}
              </div>

              <div className={styles.fieldFormGroup}>
                <label>{t('forms.fieldType')} *</label>
                <HybridSelect
                  name="type"
                  value={newField.type}
                  onChange={(value) => {
                    setNewField((prev) => ({ ...prev, type: value as any }));
                    if (fieldErrors.type) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.type;
                        return newErrors;
                      });
                    }
                  }}
                  disabled={isSubmitting}
                  options={[
                    { value: "", label: t('forms.selectFieldType') },
                    ...fieldTypes.map((type) => ({
                      value: type,
                      label: t(`forms.${type}Field`)
                    }))
                  ]}
                  placeholder={t('forms.selectFieldType')}
                  error={!!fieldErrors.type}
                />
                {fieldErrors.type && <span className={styles.inputError}>{fieldErrors.type}</span>}
              </div>
            </div>

            <div className={styles.fieldFormGroup}>
              <label>{t('forms.fieldLabel')} *</label>
              <input
                type="text"
                name="label"
                value={newField.label}
                onChange={handleFieldChange}
                disabled={isSubmitting}
                className={fieldErrors.label ? styles.errorInput : ""}
                placeholder={t('forms.fieldLabelPlaceholder')}
              />
              {fieldErrors.label && <span className={styles.inputError}>{fieldErrors.label}</span>}
            </div>

            <div className={formCheckboxStyles.checkboxGroup}>
              <label className={formCheckboxStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="required"
                  checked={newField.required || false}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                />
                <span className={formCheckboxStyles.checkboxText}>{t('forms.isFieldRequired')}</span>
              </label>
            </div>

            {(newField.type === "select" || newField.type === "radio") && (
              <div className={styles.fieldFormGroup}>
                <label>{t('forms.options')} ({t('forms.onePerLine')}) *</label>
                <textarea
                  value={newField.options?.join("\n") || ""}
                  onChange={handleOptionsChange}
                  disabled={isSubmitting}
                  rows={3}
                  className={fieldErrors.options ? styles.errorInput : ""}
                  placeholder={t('forms.optionsPlaceholder')}
                />
                {fieldErrors.options && <span className={styles.inputError}>{fieldErrors.options}</span>}
              </div>
            )}

            <button
              type="button"
              onClick={addField}
              disabled={isSubmitting || !canAddField}
              className={styles.addFieldButton}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t('forms.addField')}
            </button>
          </div>
        </div>

        <div className={formButtonStyles.actions}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('common.saving') : isEditMode ? t('common.update') : t('common.create')}
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
            {t('common.cancel')}
          </button>
        </div>

        {errors.submit && <div className={styles.formError}>{errors.submit}</div>}
      </div>
    </form>
  )
}

export default FormTemplateForm

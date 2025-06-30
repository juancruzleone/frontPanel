import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { FormTemplate, FormField } from "../hooks/useForms"
import styles from "../styles/formTemplateForm.module.css"
import { validateFormTemplate } from "../validators/formValidations"

interface FormTemplateFormProps {
  onCancel: () => void
  onSubmitSuccess: (data: FormTemplate) => Promise<void>
  isEditMode: boolean
  initialData: FormTemplate | null
  categories: string[]
}

const fieldTypes = ["text", "textarea", "number", "date", "select", "checkbox", "radio", "file"]

const FormTemplateForm = ({
  onCancel,
  onSubmitSuccess,
  isEditMode,
  initialData,
  categories,
}: FormTemplateFormProps) => {
  const [formData, setFormData] = useState<FormTemplate>({
    nombre: "",
    categoria: "",
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
        _id: initialData._id,
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

    // Validar solo si el campo tiene contenido o ya fue tocado antes
    const fieldValue = formData[fieldName as keyof FormTemplate]
    if (fieldValue || touchedFields[fieldName]) {
      await validateField(fieldName, fieldValue)
    }
  }

  const validateField = async (fieldName: string, value: any) => {
    try {
      // Crear un objeto temporal para validar solo este campo
      const tempData = { ...formData, [fieldName]: value }
      const validation = await validateFormTemplate(tempData)

      setErrors((prev) => {
        const newErrors = { ...prev }
        if (validation.errors[fieldName]) {
          newErrors[fieldName] = validation.errors[fieldName]
        } else {
          delete newErrors[fieldName]
        }
        return newErrors
      })
    } catch (error) {
      console.error("Error en validación:", error)
    }
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
      newErrors.name = "El nombre del campo es obligatorio"
    } else if (!/^[a-zA-Z0-9_]+$/.test(field.name)) {
      newErrors.name = "Solo letras, números y guiones bajos"
    } else if (formData.campos.some((existingField) => existingField.name === field.name)) {
      newErrors.name = "Ya existe un campo con este nombre"
    }

    if (!field.label.trim()) {
      newErrors.label = "La etiqueta es obligatoria"
    }

    if ((field.type === "select" || field.type === "radio") && (!field.options || field.options.length === 0)) {
      newErrors.options = "Debe agregar al menos una opción"
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

  const validateForm = async (): Promise<boolean> => {
    try {
      const validation = await validateFormTemplate(formData)
      setErrors(validation.errors)
      return validation.isValid
    } catch (error) {
      console.error("Error en validación del formulario:", error)
      setErrors({ submit: "Error en la validación del formulario" })
      return false
    }
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
      setErrors({
        submit: err.message || "Error al guardar la plantilla. Por favor intente nuevamente.",
      })
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
            <label>Nombre de la plantilla *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("nombre")}
              disabled={isSubmitting}
              className={showError("nombre") ? styles.errorInput : ""}
              placeholder="Ingrese el nombre de la plantilla"
            />
            {showError("nombre") && <span className={styles.inputError}>{errors.nombre}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Categoría *</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("categoria")}
              disabled={isSubmitting}
              className={showError("categoria") ? styles.errorInput : ""}
            >
              <option value="">Seleccione una categoría</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {showError("categoria") && <span className={styles.inputError}>{errors.categoria}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Descripción (opcional)</label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("descripcion")}
              disabled={isSubmitting}
              rows={3}
              placeholder="Descripción opcional de la plantilla"
            />
          </div>
        </div>

        <div className={styles.fieldsSection}>
          <h3 className={styles.sectionTitle}>Campos del formulario *</h3>
          {formData.campos.length === 0 && touchedFields.campos && (
            <span className={styles.inputError}>Debe agregar al menos un campo</span>
          )}

          <div className={styles.fieldsList}>
            {formData.campos.map((field, index) => (
              <div key={index} className={styles.fieldItem}>
                <div className={styles.fieldHeader}>
                  <div className={styles.fieldInfo}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <span className={styles.fieldType}>({field.type})</span>
                    {field.required && <span className={styles.requiredBadge}>Requerido</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={isSubmitting}
                    className={styles.removeFieldButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {field.options && (
                  <div className={styles.fieldOptions}>
                    <strong>Opciones:</strong> {field.options.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.addFieldForm}>
            <h4 className={styles.addFieldTitle}>Agregar nuevo campo</h4>

            <div className={styles.fieldFormRow}>
              <div className={styles.fieldFormGroup}>
                <label>Nombre del campo *</label>
                <input
                  type="text"
                  name="name"
                  value={newField.name}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                  className={fieldErrors.name ? styles.errorInput : ""}
                  placeholder="nombre_campo"
                />
                {fieldErrors.name && <span className={styles.inputError}>{fieldErrors.name}</span>}
              </div>

              <div className={styles.fieldFormGroup}>
                <label>Tipo *</label>
                <select name="type" value={newField.type} onChange={handleFieldChange} disabled={isSubmitting}>
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldFormGroup}>
              <label>Etiqueta *</label>
              <input
                type="text"
                name="label"
                value={newField.label}
                onChange={handleFieldChange}
                disabled={isSubmitting}
                className={fieldErrors.label ? styles.errorInput : ""}
                placeholder="Etiqueta del campo"
              />
              {fieldErrors.label && <span className={styles.inputError}>{fieldErrors.label}</span>}
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="required"
                  checked={newField.required || false}
                  onChange={handleFieldChange}
                  disabled={isSubmitting}
                />
                <span className={styles.checkboxText}>¿Campo requerido?</span>
              </label>
            </div>

            {(newField.type === "select" || newField.type === "radio") && (
              <div className={styles.fieldFormGroup}>
                <label>Opciones (una por línea) *</label>
                <textarea
                  value={newField.options?.join("\n") || ""}
                  onChange={handleOptionsChange}
                  disabled={isSubmitting}
                  rows={3}
                  className={fieldErrors.options ? styles.errorInput : ""}
                  placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
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
              Agregar Campo
            </button>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className={styles.submitButton}
          title={!isFormValid ? "Complete todos los campos obligatorios" : ""}
        >
          {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
        </button>
      </div>

      {errors.submit && <div className={styles.formError}>{errors.submit}</div>}
    </form>
  )
}

export default FormTemplateForm

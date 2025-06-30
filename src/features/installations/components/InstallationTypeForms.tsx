"use client"

import type React from "react"
import { useState, useMemo } from "react"
import styles from "../styles/installationForm.module.css"

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
      errors.nombre = "El nombre es obligatorio"
    } else if (data.nombre.trim().length < 2) {
      errors.nombre = "El nombre debe tener al menos 2 caracteres"
    } else if (data.nombre.trim().length > 100) {
      errors.nombre = "El nombre no puede tener más de 100 caracteres"
    }

    if (data.descripcion && data.descripcion.length > 500) {
      errors.descripcion = "La descripción no puede tener más de 500 caracteres"
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

    // Validar formulario
    const errors = validateForm(formData)
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      // Marcar todos los campos como tocados para mostrar errores
      setTouchedFields({
        nombre: true,
        descripcion: true,
        activo: true,
      })
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
          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder="Ingrese el nombre del tipo de instalación"
          />
          {showError("nombre") && <p className={styles.inputError}>{formErrors["nombre"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
            placeholder="Descripción opcional del tipo de instalación"
          />
          {showError("descripcion") && <p className={styles.inputError}>{formErrors["descripcion"]}</p>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={(e) => handleFieldChange("activo", e.target.checked)}
              disabled={isSubmitting}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}></span>
            Activo
          </label>
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
            {isSubmitting ? "Guardando..." : "Crear"}
          </button>
        </div>

        {formErrors.submit && <div className={styles.formError}>{formErrors.submit}</div>}
      </div>
    </form>
  )
}

export default InstallationTypeForms

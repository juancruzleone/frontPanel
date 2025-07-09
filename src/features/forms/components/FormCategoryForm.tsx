import { useState } from "react"
import { FormCategory } from "../hooks/useFormCategories"
import styles from "../styles/formTemplateForm.module.css"

interface FormCategoryFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onCreate: (data: FormCategory) => Promise<{ message: string }>
  formData: FormCategory
  formErrors: Record<string, string>
  handleFieldChange: (name: string, value: string | boolean) => void
  handleSubmitForm: (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onCreate: (data: FormCategory) => Promise<{ message: string }>
  ) => void
  isSubmitting: boolean
}

const FormCategoryForm = ({
  onCancel,
  onSuccess,
  onCreate,
  formData,
  formErrors,
  handleFieldChange,
  handleSubmitForm,
  isSubmitting,
}: FormCategoryFormProps) => {
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
    }
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  return (
    <form
      onSubmit={(e) => handleSubmitForm(e, onSuccess, onCreate)}
      className={styles.form}
    >
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder="Ingrese el nombre de la categoría"
          />
          {showError("nombre") && (
            <p className={styles.inputError}>{formErrors["nombre"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
            placeholder="Ingrese una descripción opcional"
          />
          {showError("descripcion") && (
            <p className={styles.inputError}>{formErrors["descripcion"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="activa"
              checked={formData.activa === true}
              onChange={(e) => handleFieldChange("activa", e.target.checked)}
              disabled={isSubmitting}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxCustom}></span>
            Activa
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={styles.cancelButton}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? "Guardando..." : "Crear"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormCategoryForm 
import { useState } from "react"
import { FormCategory } from "../hooks/useFormCategories"
import styles from "../styles/formTemplateForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import formCheckboxStyles from "../../../shared/components/Buttons/formCheckboxes.module.css"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
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
          <label>{t('forms.name')} *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ""}
            onChange={(e) => handleFieldChange("nombre", e.target.value)}
            onBlur={() => handleFieldBlur("nombre")}
            disabled={isSubmitting}
            className={showError("nombre") ? styles.errorInput : ""}
            placeholder={t('forms.enterCategoryName')}
          />
          {showError("nombre") && (
            <p className={styles.inputError}>{formErrors["nombre"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>{t('forms.description')}</label>
          <textarea
            name="descripcion"
            value={formData.descripcion || ""}
            onChange={(e) => handleFieldChange("descripcion", e.target.value)}
            onBlur={() => handleFieldBlur("descripcion")}
            disabled={isSubmitting}
            className={showError("descripcion") ? styles.errorInput : ""}
            rows={3}
            placeholder={t('forms.enterOptionalDescription')}
          />
          {showError("descripcion") && (
            <p className={styles.inputError}>{formErrors["descripcion"]}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={formCheckboxStyles.checkboxLabel}>
            <input
              type="checkbox"
              name="activa"
              checked={formData.activa === true}
              onChange={(e) => handleFieldChange("activa", e.target.checked)}
              disabled={isSubmitting}
              className={formCheckboxStyles.checkboxInput}
            />
            <span className={formCheckboxStyles.checkboxCustom}></span>
            {t('forms.active')}
          </label>
        </div>

        <div className={formButtonStyles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={formButtonStyles.cancelButton}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('common.saving') : t('common.create')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormCategoryForm 
import { useState } from "react"
import { Installation } from '../hooks/useInstallations'
import styles from '../styles/installationForm.module.css'

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
    onEdit?: (id: string, data: Installation) => Promise<{ message: string }>
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

  const fields = [
    { name: 'company', label: 'Empresa' },
    { name: 'address', label: 'Dirección' },
    { name: 'installationType', label: 'Tipo de instalación' },
    { name: 'floorSector', label: 'Piso/Sector' },
    { name: 'postalCode', label: 'Código Postal' },
    { name: 'city', label: 'Ciudad' },
    { name: 'province', label: 'Provincia' },
  ]

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }))
    }
  }

  const showError = (fieldName: string) => touchedFields[fieldName] && formErrors[fieldName]

  return (
    <form
      onSubmit={(e) =>
        handleSubmitForm(e, isEditMode, initialData || null, onSuccess, onAdd, onEdit)
      }
      className={styles.form}
    >
      <div className={styles.formInner}>
        {fields.map(({ name, label }) => (
          <div className={styles.formGroup} key={name}>
            <label>{label}</label>
            <input
              type="text"
              name={name}
              value={formData[name] || ''}
              onChange={(e) => handleFieldChange(name, e.target.value)}
              onBlur={() => handleFieldBlur(name)}
              disabled={isSubmitting}
              className={showError(name) ? styles.errorInput : ''}
            />
            {showError(name) && (
              <p className={styles.inputError}>{formErrors[name]}</p>
            )}
          </div>
        ))}

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
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default InstallationForm

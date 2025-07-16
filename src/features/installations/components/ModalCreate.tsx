import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import InstallationForm from "../../../../src/features/installations/components/InstallationForm"
import useInstallations from "../../../../src/features/installations/hooks/useInstallations"
import type { Installation } from "../hooks/useInstallations"
import styles from "../styles/Modal.module.css"

interface ModalCreateProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onSubmitError: (message: string) => void
  onAdd: (data: Installation) => Promise<{ message: string }>
}

const ModalCreate = ({ isOpen, onRequestClose, onSubmitSuccess, onSubmitError, onAdd }: ModalCreateProps) => {
  const { t } = useTranslation()
  const { formData, formErrors, handleFieldChange, handleSubmitForm, isSubmitting, resetForm, setFormErrors } =
    useInstallations()

  const handleClose = () => {
    resetForm()
    onRequestClose()
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
      setFormErrors({})
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.createInstallation')}</h2>
          <button className={styles.closeButton} onClick={handleClose} disabled={isSubmitting}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <InstallationForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onError={onSubmitError}
            onAdd={onAdd}
            isEditMode={false}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
            setFormErrors={setFormErrors}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreate

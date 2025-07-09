import { useEffect } from "react"
import FormCategoryForm from "./FormCategoryForm"
import styles from "../styles/Modal.module.css"
import useFormCategories from "../hooks/useFormCategories"

interface ModalCreateFormCategoryProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
}

const ModalCreateFormCategory = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
}: ModalCreateFormCategoryProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
    addCategory,
  } = useFormCategories()

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
          <h2 className={styles.title}>Crear Categoría de Formularios</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormCategoryForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onCreate={addCategory}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreateFormCategory 
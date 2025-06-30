import { useEffect, useState } from "react"
import FormTemplateForm from "./formTemplateForm"
import styles from "../styles/Modal.module.css"
import type { FormTemplate } from "../hooks/useForms"

interface ModalEditFormProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (data: FormTemplate) => Promise<void>
  initialData: FormTemplate | null
  categories: string[]
}

const ModalEditForm = ({ isOpen, onRequestClose, onSubmitSuccess, initialData, categories }: ModalEditFormProps) => {
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null)

  useEffect(() => {
    if (isOpen && initialData) {
      setCurrentTemplate({ ...initialData })
    } else if (!isOpen) {
      setCurrentTemplate(null)
    }
  }, [isOpen, initialData])

  const handleClose = () => {
    setCurrentTemplate(null)
    onRequestClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Plantilla</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormTemplateForm
            onCancel={handleClose}
            onSubmitSuccess={onSubmitSuccess}
            isEditMode={true}
            initialData={currentTemplate}
            categories={categories}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEditForm

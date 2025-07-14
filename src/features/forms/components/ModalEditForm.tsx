import { useEffect, useState } from "react"
import FormTemplateForm from "./formTemplateForm"
import styles from "../styles/Modal.module.css"
import type { FormTemplate } from "../hooks/useForms"
import { useTranslation } from "react-i18next"

interface ModalEditFormProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (data: FormTemplate) => Promise<void>
  initialData: FormTemplate | null
  categories: string[]
}

const ModalEditForm = ({ isOpen, onRequestClose, onSubmitSuccess, initialData, categories }: ModalEditFormProps) => {
  const { t } = useTranslation()
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
          <h2 className={styles.title}>{t('forms.editFormTemplate')}</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormTemplateForm
            onCancel={handleClose}
            onSubmitSuccess={onSubmitSuccess}
            onSubmitError={(message: string) => console.error(message)}
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

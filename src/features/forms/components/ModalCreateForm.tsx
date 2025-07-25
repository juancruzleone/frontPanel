import { useEffect, useState } from "react"
import FormTemplateForm from "./formTemplateForm"
import styles from "../styles/Modal.module.css"
import type { FormTemplate } from "../hooks/useForms"
import { useTranslation } from "react-i18next"

interface ModalCreateFormProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (data: FormTemplate) => Promise<void>
  onSubmitError: (message: string) => void
  initialData: FormTemplate | null
  categories: string[]
}

const ModalCreateForm = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onSubmitError,
  initialData,
  categories,
}: ModalCreateFormProps) => {
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
          <h2 className={styles.title}>{t('forms.createFormTemplate')}</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <FormTemplateForm
            onCancel={handleClose}
            onSubmitSuccess={onSubmitSuccess}
            onSubmitError={onSubmitError}
            isEditMode={false}
            initialData={currentTemplate}
            categories={categories}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreateForm

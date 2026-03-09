import { useTranslation } from 'react-i18next'
import styles from './EditModal.module.css'
import buttonStyles from './Buttons/formButtons.module.css'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
  onSave: () => void
  title: string
  children: React.ReactNode
  isLoading?: boolean
  saveText?: string
  cancelText?: string
}

const EditModal = ({
  isOpen,
  onRequestClose,
  onSave,
  title,
  children,
  isLoading = false,
  saveText,
  cancelText
}: Props) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{title}</h2>
          <button 
            onClick={onRequestClose} 
            className={styles.closeButton} 
            disabled={isLoading}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <div className={styles.formInner}>
              {children}
            </div>
            <div className={buttonStyles.actions}>
              <button
                type="button"
                onClick={onRequestClose}
                className={buttonStyles.cancelButton}
                disabled={isLoading}
                aria-label={cancelText || t('common.cancel')}
              >
                {cancelText || t('common.cancel')}
              </button>
              <button
                type="submit"
                className={buttonStyles.submitButton}
                disabled={isLoading}
                aria-label={saveText || t('common.save')}
              >
                {isLoading ? t('common.loading') : (saveText || t('common.save'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditModal

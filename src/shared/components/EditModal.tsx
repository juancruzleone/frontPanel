import Modal from 'react-modal'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './EditModal.module.css'

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

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className={styles.modal}
      overlayClassName={styles.backdrop}
      ariaHideApp={false}
    >
      <div className={styles.modalHeader}>
        <h2>{title}</h2>
        <button 
          onClick={onRequestClose} 
          className={styles.closeButton} 
          disabled={isLoading}
          aria-label={t('common.close')}
        >
          <X size={24} />
        </button>
      </div>

      <div className={styles.modalBody}>
        {children}
      </div>

      <div className={styles.modalFooter}>
        <button
          onClick={onRequestClose}
          className={styles.cancelButton}
          disabled={isLoading}
          aria-label={cancelText || t('common.cancel')}
        >
          {cancelText || t('common.cancel')}
        </button>
        <button
          onClick={onSave}
          className={styles.saveButton}
          disabled={isLoading}
          aria-label={saveText || t('common.save')}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              {t('common.loading')}
            </>
          ) : (
            saveText || t('common.save')
          )}
        </button>
      </div>
    </Modal>
  )
}

export default EditModal

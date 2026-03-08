import Modal from 'react-modal'
import { X, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './ConfirmModal.module.css'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'danger' | 'warning' | 'info'
}

const ConfirmModal = ({
  isOpen,
  onRequestClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
  variant = 'warning'
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
      <div className={styles.modalContent}>
        <button onClick={onRequestClose} className={styles.closeButton} disabled={isLoading}>
          <X size={20} />
        </button>

        <div className={`${styles.iconContainer} ${styles[variant]}`}>
          <AlertTriangle size={48} />
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            onClick={onRequestClose}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.confirmButton} ${styles[variant]}`}
            disabled={isLoading}
          >
            {isLoading ? t('common.loading') : confirmText || t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal

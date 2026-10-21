import Modal from 'react-modal'
import { useTranslation } from 'react-i18next'
import styles from './SuccessModal.module.css'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
  title: string
  message: string
  buttonText?: string
  /** "error" reuses the same modal shell with an error icon and actions. */
  variant?: "success" | "error"
  /** Accessible role for the message paragraph (OAuth callback pins role="alert"). */
  messageRole?: "alert" | "status"
  secondaryButtonText?: string
  onSecondaryAction?: () => void
}

const SuccessModal = ({
  isOpen,
  onRequestClose,
  title,
  message,
  buttonText,
  variant = "success",
  messageRole,
  secondaryButtonText,
  onSecondaryAction,
}: Props) => {
  const { t } = useTranslation()
  const isError = variant === "error"
  const bodyClass = isError
    ? `${styles.successContentBody} ${styles.errorContentBody}`
    : styles.successContentBody
  const iconClass = isError
    ? `${styles.successIconLarge} ${styles.errorIconLarge}`
    : styles.successIconLarge
  const primaryClass = isError
    ? `${styles.successButtonLarge} ${styles.errorButtonLarge}`
    : styles.successButtonLarge

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className={styles.modal}
      overlayClassName={styles.backdrop}
      ariaHideApp={false}
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.title}>{title}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          ×
        </button>
      </div>
      <div className={styles.modalContent}>
        <div className={bodyClass}>
          <div className={iconClass}>
            {isError ? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ef4444" />
                <path d="m9 9 6 6m0-6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#10b981" />
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <p className={styles.successMessageLarge} role={messageRole}>{message}</p>
          <button onClick={onRequestClose} className={primaryClass}>
            {buttonText || t('common.continue')}
          </button>
          {secondaryButtonText && onSecondaryAction && (
            <button onClick={onSecondaryAction} className={styles.secondaryButtonLarge}>
              {secondaryButtonText}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default SuccessModal

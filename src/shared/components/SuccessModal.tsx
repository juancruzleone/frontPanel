import Modal from 'react-modal'
import { useTranslation } from 'react-i18next'
import styles from './SuccessModal.module.css'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
  title: string
  message: string
  buttonText?: string
}

const SuccessModal = ({
  isOpen,
  onRequestClose,
  title,
  message,
  buttonText
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
        <h2 className={styles.title}>{title}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          ×
        </button>
      </div>
      <div className={styles.modalContent}>
        <div className={styles.successContentBody}>
          <div className={styles.successIconLarge}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#10b981"/>
              <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className={styles.successMessageLarge}>{message}</p>
          <button onClick={onRequestClose} className={styles.successButtonLarge}>
            {buttonText || t('common.continue')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SuccessModal

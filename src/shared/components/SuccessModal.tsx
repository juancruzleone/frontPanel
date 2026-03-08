import Modal from 'react-modal'
import { CheckCircle, X } from 'lucide-react'
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
      <div className={styles.modalContent}>
        <button onClick={onRequestClose} className={styles.closeButton}>
          <X size={20} />
        </button>

        <div className={styles.iconContainer}>
          <CheckCircle size={64} />
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <button onClick={onRequestClose} className={styles.okButton}>
          {buttonText || t('common.ok')}
        </button>
      </div>
    </Modal>
  )
}

export default SuccessModal

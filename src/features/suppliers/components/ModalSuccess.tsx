import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import styles from '../styles/Modal.module.css'

interface ModalSuccessProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

const ModalSuccess: React.FC<ModalSuccessProps> = ({ isOpen, message, onClose }) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('common.successTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.successContentBody}>
          <div className={styles.successIconLarge}>
            <Check size={48} color="#10b981" />
          </div>
          <p className={styles.successMessageLarge}>{message}</p>
          <button
            onClick={onClose}
            className={styles.successButtonLarge}
          >
            {t('common.understood')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalSuccess

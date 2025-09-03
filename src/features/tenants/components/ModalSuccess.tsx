import React from 'react'
import { useTranslation } from 'react-i18next'
import { X, CheckCircle } from 'lucide-react'
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
        <div className={styles.successContentBody}>
          <div className={styles.successIconLarge}>
            <CheckCircle size={48} color="#10b981" />
          </div>
          
          <p className={styles.successMessageLarge}>{message}</p>

          <button
            type="button"
            onClick={onClose}
            className={styles.successButtonLarge}
          >
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalSuccess 
import styles from "../styles/Modal.module.css";
import { useTranslation } from "react-i18next"

type ModalErrorProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  mensaje: string;
}

const ModalError = ({ isOpen, onRequestClose, mensaje }: ModalErrorProps) => {
  const { t } = useTranslation()
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('common.error')}</h2>
          <button 
            className={styles.closeButton}
            onClick={onRequestClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.errorContentBody}>
            <div className={styles.errorIconLarge}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                <path d="m15 9-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className={styles.errorMessageLarge}>{mensaje}</p>
            <button 
              className={styles.errorButtonLarge} 
              onClick={onRequestClose}
            >
              {t('common.understood')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalError; 
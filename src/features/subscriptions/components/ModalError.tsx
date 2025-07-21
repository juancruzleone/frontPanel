import { useTranslation } from "react-i18next";
import styles from "../styles/Modal.module.css";

type ModalErrorProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  mensaje: string;
}

const ModalError = ({ isOpen, onRequestClose, mensaje }: ModalErrorProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title} style={{ color: '#dc2626' }}>{t('common.error')}</h2>
          <button 
            className={styles.closeButton}
            onClick={onRequestClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.successContentBody}>
            <div className={styles.successIconLarge}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#dc2626"/>
                <path d="M9 9l6 6M15 9l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className={styles.successMessageLarge}>{mensaje}</p>
            <button 
              className={styles.successButtonLarge} 
              onClick={onRequestClose}
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
            >
              {t('common.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalError; 
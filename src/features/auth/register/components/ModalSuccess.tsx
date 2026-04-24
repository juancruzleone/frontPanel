import styles from "../styles/Modal.module.css";
import { useTranslation } from "react-i18next";

interface ModalSuccessProps {
  isOpen: boolean;
  onClose?: () => void;
  onRequestClose?: () => void;
  message?: string;
  mensaje?: string;
}

export const ModalSuccess = ({ isOpen, onClose, onRequestClose, message, mensaje }: ModalSuccessProps) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const handleClose = onClose ?? onRequestClose ?? (() => {})
  const modalMessage = message ?? mensaje ?? ""

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('common.successTitle')}</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.successContentBody}>
            <div className={styles.successIconLarge}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#10b981" />
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={styles.successMessageLarge}>{modalMessage}</p>
            <button
              className={styles.successButtonLarge}
              onClick={handleClose}
            >
              {t('common.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalSuccess;

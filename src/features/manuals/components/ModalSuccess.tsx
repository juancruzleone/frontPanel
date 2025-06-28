import styles from "../styles/modal.module.css";

interface ModalSuccessProps {
  isOpen: boolean;
  onRequestClose: () => void;
  message: string;
}

const ModalSuccess = ({ isOpen, onRequestClose, message }: ModalSuccessProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>¡Operación exitosa!</h2>
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
                <circle cx="12" cy="12" r="10" fill="#10b981"/>
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className={styles.successMessageLarge}>{message}</p>
            <button 
              className={styles.successButtonLarge} 
              onClick={onRequestClose}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalSuccess;
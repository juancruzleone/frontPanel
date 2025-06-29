import styles from "../styles/Modal.module.css";

interface ModalConfirmDeleteProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const ModalConfirmDelete = ({
  isOpen,
  onCancel,
  onConfirm,
  title = "¿Eliminar manual?",
  description = "Esta acción no se puede deshacer. ¿Estás seguro de que deseas continuar?",
}: ModalConfirmDeleteProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.confirmModal}>
        <div className={styles.confirmHeader}>
          <div className={styles.warningIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#ef4444"/>
              <path d="M12 8v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className={styles.confirmContent}>
          <h2 className={styles.confirmTitle}>{title}</h2>
          <p className={styles.confirmDescription}>{description}</p>
          <div className={styles.confirmActions}>
            <button
              onClick={onCancel}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={styles.deleteButton}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmDelete;
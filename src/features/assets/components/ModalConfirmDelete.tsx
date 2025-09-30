import styles from "../styles/Modal.module.css";
import { useTranslation } from "react-i18next"

interface ModalConfirmDeleteProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

const ModalConfirmDelete = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
}: ModalConfirmDeleteProps) => {
  const { t } = useTranslation()
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
          <button 
            className={styles.confirmCloseButton}
            onClick={onCancel}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className={styles.confirmContent}>
          <h2 className={styles.confirmTitle}>{t('assets.confirmDeleteAsset') || title}</h2>
          <p className={styles.confirmDescription}>{t('assets.confirmDeleteAssetDescription') || description}</p>
          <div className={styles.confirmActions}>
            <button className={styles.deleteButton} onClick={onConfirm}
              aria-label={t('assets.deleteAssetTooltip')}
              data-tooltip={t('assets.deleteAssetTooltip')}
            >
              {t('assets.delete')}
            </button>
            <button className={styles.cancelButton} onClick={onCancel}>
              {t('assets.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmDelete;
import { useTranslation } from "react-i18next"
import styles from "../styles/compliance.module.css"

interface ComplianceModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
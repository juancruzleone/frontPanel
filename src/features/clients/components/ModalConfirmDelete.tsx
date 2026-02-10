import { useTranslation } from "react-i18next"
import styles from "../styles/Modal.module.css"
import buttonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface ModalConfirmDeleteProps {
    isOpen: boolean
    onCancel: () => void
    onConfirm: () => void
    title: string
    description: string
}

const ModalConfirmDelete = ({ isOpen, onCancel, onConfirm, title, description }: ModalConfirmDeleteProps) => {
    const { t } = useTranslation()
    if (!isOpen) return null

    return (
        <div className={styles.backdrop}>
            <div className={styles.confirmModal}>
                <div className={styles.confirmHeader}>
                    <div className={styles.warningIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" fill="#ef4444" />
                            <path d="M12 8v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                <div className={styles.confirmContent}>
                    <h2 className={styles.confirmTitle}>{title}</h2>
                    <p className={styles.confirmDescription}>{description}</p>
                </div>
                <div className={buttonStyles.actions}>
                    <button className={buttonStyles.cancelButton} onClick={onCancel}>
                        {t('common.cancel')}
                    </button>
                    <button className={buttonStyles.submitButton} onClick={onConfirm} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderColor: '#ef4444', color: 'white' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; e.currentTarget.style.color = 'white'; }}>
                        {t('common.delete')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ModalConfirmDelete

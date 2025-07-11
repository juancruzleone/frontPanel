import InstallationTypeForm from "./InstallationTypeForms"
import styles from "../styles/Modal.module.css"
import { useTranslation } from "react-i18next"

interface ModalCreateInstallationTypeProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onCreate: (data: any) => Promise<{ message: string }>
}

const ModalCreateInstallationType = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onCreate,
}: ModalCreateInstallationTypeProps) => {
  const { t } = useTranslation()
  const handleClose = () => {
    onRequestClose()
  }

  const handleSuccess = (message: string) => {
    onSubmitSuccess(message)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.createInstallationType')}</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <InstallationTypeForm onCancel={handleClose} onSuccess={handleSuccess} onCreate={onCreate} />
        </div>
      </div>
    </div>
  )
}

export default ModalCreateInstallationType

import { useState } from "react"
import styles from "../styles/Modal.module.css"
import AssignInstallationsForm from "./AssignInstallationsForm"
import { useTranslation } from "react-i18next"

interface Installation {
  _id: string
  company: string
  address: string
  city?: string
  province?: string
}

interface ModalAssignInstallationsProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onAssign: (clientId: string, installationIds: string[]) => Promise<{ message: string }>
  client: any
  installations: Installation[]
}

const ModalAssignInstallations = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAssign,
  client,
  installations,
}: ModalAssignInstallationsProps) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    if (!isSubmitting) {
      onRequestClose()
    }
  }

  const handleAssign = async (installationIds: string[]) => {
    if (!client?._id && !client?.id) {
      throw new Error(t('clients.invalidClient'))
    }

    setIsSubmitting(true)
    try {
      const result = await onAssign(client._id || client.id, installationIds)
      return result
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !client) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('clients.assignInstallationsTitle')}</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <AssignInstallationsForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onAssign={handleAssign}
            installations={installations}
            isSubmitting={isSubmitting}
            clientName={client.userName}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalAssignInstallations

import { useState, useEffect, useCallback } from "react"
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

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onRequestClose()
    }
  }, [isSubmitting, onRequestClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose],
  )

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

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
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div>
              <h2 className={styles.title}>{t('clients.assignInstallationsTitle')}</h2>
              <p className={styles.subtitle}>{t('clients.assignInstallationsSubtitle')}</p>
            </div>
          </div>
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

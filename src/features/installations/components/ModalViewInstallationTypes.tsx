import { useEffect, useState } from "react"
import styles from "../styles/Modal.module.css"
import { fetchInstallationTypes } from "../services/installationTypeServices"
import { useTranslation } from "react-i18next"

interface InstallationType {
  _id: string
  nombre: string
  descripcion?: string
  fechaCreacion: string
}

interface ModalViewInstallationTypesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalViewInstallationTypes = ({ isOpen, onRequestClose }: ModalViewInstallationTypesProps) => {
  const { t, i18n } = useTranslation()
  const [installationTypes, setInstallationTypes] = useState<InstallationType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadInstallationTypes()
    }
  }, [isOpen])

  const loadInstallationTypes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInstallationTypes()
      setInstallationTypes(data)
    } catch (err) {
      setError(t('installations.errorLoadingTypes'))
      console.error("Error loading installation types:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.viewTypesTitle')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loadingMessage}>
              <div className={styles.spinner}></div>
              {t('installations.loadingTypes')}
            </div>
          ) : error ? (
            <div className={styles.generalError}>
              {t('installations.errorLoadingTypes')}
              <button onClick={loadInstallationTypes} className={styles.retryButton}>
                {t('common.retry')}
              </button>
            </div>
          ) : installationTypes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('installations.noTypes')}</p>
              <p className={styles.emptyStateSubtext}>
                {t('installations.noTypesSubtext')}
              </p>
            </div>
          ) : (
            <div className={styles.listContainer}>
              {installationTypes.map((type) => (
                <div key={type._id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemTitle}>{type.nombre}</div>
                    {type.descripcion && (
                      <div className={styles.itemDescription}>{type.descripcion}</div>
                    )}
                    <div className={styles.itemDate}>
                      {t('installations.created')}: {formatDate(type.fechaCreacion)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onRequestClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalViewInstallationTypes 
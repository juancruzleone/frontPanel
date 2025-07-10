import { useEffect, useState } from "react"
import styles from "../styles/Modal.module.css"
import { fetchInstallationTypes } from "../services/installationTypeServices"

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
      setError("Error al cargar los tipos de instalación")
      console.error("Error loading installation types:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
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
          <h2 className={styles.title}>Tipos de Instalación</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loading ? (
            <div className={styles.loadingMessage}>
              <div className={styles.spinner}></div>
              Cargando tipos de instalación...
            </div>
          ) : error ? (
            <div className={styles.generalError}>
              {error}
              <button onClick={loadInstallationTypes} className={styles.retryButton}>
                Reintentar
              </button>
            </div>
          ) : installationTypes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay tipos de instalación creados</p>
              <p className={styles.emptyStateSubtext}>
                Los tipos de instalación aparecerán aquí una vez que sean creados
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
                      Creado: {formatDate(type.fechaCreacion)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onRequestClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalViewInstallationTypes 
import { useEffect } from "react"
import styles from "/src/features/installations/styles/Modal.module.css"
import type { Installation, Device } from "../hooks/useInstallations"
import DeviceForm from "./DeviceForm"
import useCategories from "../hooks/useCategories"

interface ModalAddDeviceProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onAddDevice: (installationId: string, device: Device) => Promise<{ message: string }>
  installation: Installation | null
  assets: any[]
  loadingAssets: boolean
  errorLoadingAssets: string | null
  onRetryLoadAssets: () => void
  loadAssets: () => void
}

const ModalAddDevice = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onAddDevice,
  installation,
  assets,
  loadingAssets,
  errorLoadingAssets,
  onRetryLoadAssets,
  loadAssets,
}: ModalAddDeviceProps) => {
  const { categories, loading: loadingCategories, error: errorLoadingCategories, loadCategories } = useCategories()

  useEffect(() => {
    if (isOpen) {
      // Solo cargar assets si no están ya cargados
      if (assets.length === 0) {
        loadAssets()
      }
      loadCategories() // Cargar categorías cuando se abre el modal
    }
  }, [isOpen, assets.length])

  const handleRetryLoadCategories = () => {
    loadCategories()
  }

  if (!isOpen || !installation) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Agregar Dispositivo</h2>
          <p>
            Instalación: {installation.company} - {installation.address}
          </p>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {loadingAssets || loadingCategories ? (
            <p>Cargando datos necesarios...</p>
          ) : errorLoadingAssets ? (
            <>
              <p>{errorLoadingAssets.includes("No hay activos") ? errorLoadingAssets : "Error al cargar activos"}</p>
              <button onClick={onRetryLoadAssets}>Reintentar carga de activos</button>
            </>
          ) : errorLoadingCategories ? (
            <>
              <p>Error al cargar categorías</p>
              <button onClick={handleRetryLoadCategories}>Reintentar carga de categorías</button>
            </>
          ) : assets.length === 0 ? (
            <p>No hay activos disponibles. Primero crear activos en la sección correspondiente.</p>
          ) : categories.length === 0 ? (
            <p>No hay categorías disponibles. Primero crear categorías en la sección correspondiente.</p>
          ) : (
            <DeviceForm
              installation={installation}
              onSubmitSuccess={onSubmitSuccess}
              onAddDevice={onAddDevice}
              onCancel={onRequestClose}
              assets={assets}
              categories={categories}
              loadingCategories={loadingCategories}
              errorLoadingCategories={errorLoadingCategories}
              onRetryLoadCategories={handleRetryLoadCategories}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ModalAddDevice

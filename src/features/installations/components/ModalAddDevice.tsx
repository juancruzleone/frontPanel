import { useEffect } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('installations.addDevice')}</h2>
            <p className={styles.installationInfo}>
              {t('installations.installation')}: {installation.company} - {installation.address}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {loadingAssets || loadingCategories ? (
            <div className={styles.loaderContainer}>
              <p>{t('installations.loadingRequiredData')}</p>
            </div>
          ) : errorLoadingAssets ? (
            <>
              <p>{errorLoadingAssets.includes("No hay activos") ? errorLoadingAssets : t('installations.errorLoadingAssets')}</p>
              <button onClick={onRetryLoadAssets}>{t('installations.retryLoadAssets')}</button>
            </>
          ) : errorLoadingCategories ? (
            <>
              <p>{t('installations.errorLoadingCategories')}</p>
              <button onClick={handleRetryLoadCategories}>{t('installations.retryLoadCategories')}</button>
            </>
          ) : assets.length === 0 ? (
            <p>{t('installations.noAssetsAvailable')}. {t('installations.createAssetsFirst')}.</p>
          ) : categories.length === 0 ? (
            <p>{t('installations.noCategoriesAvailable')}. {t('installations.createCategoriesFirst')}.</p>
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

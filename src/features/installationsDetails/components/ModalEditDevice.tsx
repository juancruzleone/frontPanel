import { useEffect } from "react"
import styles from "/src/features/installations/styles/Modal.module.css"
import type { Installation, Device } from "../../../features/installations/hooks/useInstallations.ts"
import DeviceForm from "../../../features/installations/components/DeviceForm.tsx"
import useCategories from "../../../features/installations/hooks/useCategories.ts"
import { useTranslation } from "react-i18next"

interface ModalEditDeviceProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onUpdateDevice: (installationId: string, deviceId: string, device: Partial<Device>) => Promise<{ message: string }>
  installation: Installation | null
  device: Device | null
  assets: any[]
  loadingAssets: boolean
  errorLoadingAssets: string | null
  onRetryLoadAssets: () => void
  loadAssets: () => void
}

const ModalEditDevice = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onUpdateDevice,
  installation,
  device,
  assets,
  loadingAssets,
  errorLoadingAssets,
  onRetryLoadAssets,
  loadAssets,
}: ModalEditDeviceProps) => {
  const { t } = useTranslation()
  const { categories, loading: loadingCategories, error: errorLoadingCategories, loadCategories } = useCategories()

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      loadCategories()
    }
  }, [isOpen])

  const handleRetryLoadCategories = () => {
    loadCategories()
  }

  if (!isOpen || !installation || !device) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installationDetails.editDevice')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loadingAssets || loadingCategories ? (
            <div className={styles.loaderContainer}>
              <p>{t('installationDetails.loadingRequiredData')}</p>
            </div>
          ) : errorLoadingCategories ? (
            <>
              <p>{t('installationDetails.errorLoadingCategories')}</p>
              <button onClick={handleRetryLoadCategories}>{t('installationDetails.retryLoadCategories')}</button>
            </>
          ) : (
            <DeviceForm
              installation={installation}
              device={device}
              onSubmitSuccess={onSubmitSuccess}
              onUpdateDevice={onUpdateDevice}
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

export default ModalEditDevice

import AssetForm from "./AssetForm"
import useAssets, { type Asset } from "../hooks/useAssets"
import styles from "../styles/Modal.module.css"
import { useTranslation } from "react-i18next"

interface ModalCreateProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onSubmitError: (message: string) => void
  onAdd: (data: Asset) => Promise<{ message: string }>
}

const ModalCreate = ({ isOpen, onRequestClose, onSubmitSuccess, onSubmitError, onAdd }: ModalCreateProps) => {
  const { t } = useTranslation()
  const { templates, templatesLoading, categories } = useAssets()

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('assets.createAsset')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <AssetForm
            onCancel={onRequestClose}
            onSuccess={onSubmitSuccess}
            onError={onSubmitError}
            onAdd={onAdd}
            isEditMode={false}
            templates={templates}
            templatesLoading={templatesLoading}
            categories={categories}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreate

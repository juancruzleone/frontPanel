"use client"

import AssetForm from "./AssetForm"
import useAssets, { type Asset } from "../hooks/useAssets"
import styles from "../styles/Modal.module.css"

interface ModalEditProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onEdit: (id: string, data: Asset) => Promise<{ message: string }>
  initialData: Asset | null
}

const ModalEdit = ({ isOpen, onRequestClose, onSubmitSuccess, onEdit, initialData }: ModalEditProps) => {
  const { templates, templatesLoading, categories } = useAssets()

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Activo</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <AssetForm
            onCancel={onRequestClose}
            onSuccess={onSubmitSuccess}
            onEdit={onEdit}
            isEditMode={true}
            initialData={initialData}
            templates={templates}
            templatesLoading={templatesLoading}
            categories={categories}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEdit

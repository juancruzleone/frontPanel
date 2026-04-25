import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SupplierForm } from './SupplierForm'
import { useSuppliers } from '../hooks/useSuppliers'
import styles from '../styles/Modal.module.css'

interface ModalEditProps {
  isOpen: boolean
  supplier: any
  onClose: () => void
  onSuccess: (message: string) => void
}

const ModalEdit: React.FC<ModalEditProps> = ({ isOpen, supplier, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const { updateSupplier } = useSuppliers()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    if (!supplier?._id) return
    try {
      setIsLoading(true)
      await updateSupplier(supplier._id, data)
      onSuccess(t('suppliers.supplierUpdated'))
      onClose()
    } catch (error) {
      console.error('Error updating supplier:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{t('suppliers.editSupplier')}</h2>
          </div>
          <button
            onClick={handleCancel}
            className={styles.closeButton}
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <SupplierForm
            initialData={supplier}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEdit

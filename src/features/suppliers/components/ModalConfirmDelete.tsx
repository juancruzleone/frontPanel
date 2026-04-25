import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import { useSuppliers } from '../hooks/useSuppliers'
import styles from '../styles/Modal.module.css'

interface ModalConfirmDeleteProps {
  isOpen: boolean
  supplier: any
  onClose: () => void
  onSuccess: (message: string) => void
}

const ModalConfirmDelete: React.FC<ModalConfirmDeleteProps> = ({ isOpen, supplier, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const { removeSupplier } = useSuppliers()
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!supplier?._id) return
    try {
      setIsLoading(true)
      await removeSupplier(supplier._id)
      onSuccess(t('suppliers.supplierDeleted'))
      onClose()
    } catch (error) {
      console.error('Error deleting supplier:', error);
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
      <div className={styles.confirmModal}>
        <div className={styles.confirmHeader}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <button
            onClick={handleCancel}
            className={styles.confirmCloseButton}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.confirmContent}>
          <h2 className={styles.confirmTitle}>{t('suppliers.deleteSupplier')}</h2>
          <p className={styles.confirmDescription}>
            {t('suppliers.deleteConfirmMessage', { name: supplier?.name })}
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className={styles.deleteButton}
            disabled={isLoading}
          >
            {isLoading ? t('common.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmDelete

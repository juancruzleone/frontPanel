import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { SupplierForm } from './SupplierForm'
import { useSuppliers } from '../hooks/useSuppliers'
import styles from '../styles/Modal.module.css'

interface ModalCreateProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

const ModalCreate: React.FC<ModalCreateProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const { addSupplier } = useSuppliers()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      await addSupplier(data)
      onSuccess(t('suppliers.supplierAdded'))
      onClose()
    } catch (error) {
      console.error('Error creating supplier:', error);
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
            <h2 className={styles.title}>{t('suppliers.addSupplier')}</h2>
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
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalCreate

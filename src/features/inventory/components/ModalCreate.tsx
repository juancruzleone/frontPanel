import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { InventoryForm } from './InventoryForm'
import useInventory from '../hooks/useInventory'
import styles from '../styles/Modal.module.css'

interface ModalCreateProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
}

const ModalCreate: React.FC<ModalCreateProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const { addInventoryItem } = useInventory()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      await addInventoryItem(data)
      onSuccess(t('inventory.itemAdded'))
      onClose()
    } catch (error) {
      console.error('Error creating inventory item:', error);
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
          <h2 className={styles.title}>{t('inventory.addItem')}</h2>
          <button
            onClick={handleCancel}
            className={styles.closeButton}
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <InventoryForm
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

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { InventoryForm } from './InventoryForm'
import useInventory from '../hooks/useInventory'
import { InventoryItem } from '../types/inventory.types'
import styles from '../styles/Modal.module.css'

interface ModalEditProps {
  isOpen: boolean
  item: InventoryItem | null
  onClose: () => void
  onSuccess: (message: string) => void
}

const ModalEdit: React.FC<ModalEditProps> = ({ isOpen, item, onClose, onSuccess }) => {
  const { t } = useTranslation()
  const { updateInventoryItem } = useInventory()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    if (!item?._id) return
    try {
      setIsLoading(true)
      await updateInventoryItem(item._id, data)
      onSuccess(t('inventory.itemUpdated'))
      onClose()
    } catch (error) {
      console.error('Error updating inventory item:', error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('inventory.editItem')}</h2>
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
            initialData={item}
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

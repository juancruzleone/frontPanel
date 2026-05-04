import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { InventoryItem } from "../types/inventory.types"
import { X } from "lucide-react"
import styles from "../styles/Modal.module.css"
import formStyles from "../styles/inventoryForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface ModalAdjustStockProps {
  isOpen: boolean
  onRequestClose: () => void
  item: InventoryItem | null
  onAdjust: (quantity: number, type: 'entry' | 'exit' | 'adjustment', reason: string) => Promise<void>
  onError?: (message: string) => void
}

const isAdjustmentType = (value: string): value is 'entry' | 'exit' | 'adjustment' => {
  return value === 'entry' || value === 'exit' || value === 'adjustment'
}

export const ModalAdjustStock: React.FC<ModalAdjustStockProps> = ({ 
  isOpen, 
  onRequestClose, 
  item, 
  onAdjust,
  onError,
}) => {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState(1)
  const [type, setType] = useState<'entry' | 'exit' | 'adjustment'>('entry')
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onAdjust(quantity, type, reason)
      onRequestClose()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('inventory.adjustStock')}: {item.name}</h2>
          <button onClick={onRequestClose} className={styles.closeButton} disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit} className={formStyles.form}>
            <div className={formStyles.formContent}>
              <div className={formStyles.formGroup}>
                <label>{t('inventory.adjustmentType')}</label>
                <select 
                  value={type} 
                  onChange={(e) => {
                    if (isAdjustmentType(e.target.value)) {
                      setType(e.target.value)
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <option value="entry">{t('inventory.entry')}</option>
                  <option value="exit">{t('inventory.exit')}</option>
                  <option value="adjustment">{t('inventory.manualAdjustment')}</option>
                </select>
              </div>

              <div className={formStyles.formGroup}>
                <label>
                  {type === 'adjustment' ? t('inventory.newStock') : t('inventory.quantity')}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min={0}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className={formStyles.formGroup}>
                <label>{t('inventory.reason')}</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('inventory.reasonPlaceholder')}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className={formButtonStyles.actions}>
              <button
                type="button"
                onClick={onRequestClose}
                className={formButtonStyles.cancelButton}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className={formButtonStyles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ModalAdjustStock

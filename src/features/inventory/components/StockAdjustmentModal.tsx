import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import Modal from "react-modal"
import { InventoryItem } from "../types/inventory.types"
import { X } from "lucide-react"

interface StockAdjustmentModalProps {
  isOpen: boolean
  onRequestClose: () => void
  item: InventoryItem | null
  onAdjust: (quantity: number, type: 'entry' | 'exit' | 'adjustment', reason: string) => Promise<void>
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ 
  isOpen, 
  onRequestClose, 
  item, 
  onAdjust 
}) => {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState(1)
  const [type, setType] = useState<'entry' | 'exit' | 'adjustment'>('entry')
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onAdjust(quantity, type, reason)
      onRequestClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="max-w-md w-full bg-white p-6 rounded-lg shadow-xl outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('inventory.adjustStock')}: {item.name}</h2>
        <button onClick={onRequestClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">{t('inventory.adjustmentType')}</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as any)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="entry">{t('inventory.entry')}</option>
            <option value="exit">{t('inventory.exit')}</option>
            <option value="adjustment">{t('inventory.manualAdjustment')}</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">
            {type === 'adjustment' ? t('inventory.newStock') : t('inventory.quantity')}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={0}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700">{t('inventory.reason')}</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder={t('inventory.reasonPlaceholder')}
            required
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onRequestClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

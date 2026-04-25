import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import Modal from "react-modal"
import { X } from "lucide-react"
import { InventoryItem, InventoryMovement } from "../types/inventory.types"
import { fetchInventoryMovements } from "../services/inventoryServices"
import DataTable from "../../../components/DataTable/DataTable"

interface MovementHistoryProps {
  isOpen: boolean
  onRequestClose: () => void
  item: InventoryItem | null
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({ 
  isOpen, 
  onRequestClose, 
  item 
}) => {
  const { t } = useTranslation()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && item?._id) {
      setLoading(true)
      fetchInventoryMovements(item._id)
        .then(res => setMovements(res))
        .finally(() => setLoading(false))
    }
  }, [isOpen, item])

  if (!item) return null

  const columns = [
    {
      key: 'createdAt',
      header: t('common.date'),
      render: (m: InventoryMovement) => new Date(m.createdAt).toLocaleString(),
      width: '25%'
    },
    {
      key: 'type',
      header: t('common.type'),
      render: (m: InventoryMovement) => t(`inventory.movementTypes.${m.type}`),
      width: '15%'
    },
    {
      key: 'quantity',
      header: t('inventory.quantity'),
      align: 'center' as const,
      width: '15%'
    },
    {
      key: 'afterStock',
      header: t('inventory.stock'),
      align: 'center' as const,
      width: '15%'
    },
    {
        key: 'performedBy',
        header: t('common.user'),
        width: '30%'
    }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="max-w-3xl w-full bg-white p-6 rounded-lg shadow-xl outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('inventory.history')}: {item.name}</h2>
        <button onClick={onRequestClose} className="p-1 hover:bg-gray-100 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        <DataTable
            data={movements}
            columns={columns}
            emptyMessage={t('inventory.noMovementsFound')}
        />
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onRequestClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  )
}

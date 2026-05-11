import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import { InventoryItem, InventoryMovement } from "../types/inventory.types"
import { fetchInventoryMovements } from "../services/inventoryServices"
import DataTable from "../../../components/DataTable/DataTable"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface ModalMovementHistoryProps {
  isOpen: boolean
  onRequestClose: () => void
  item: InventoryItem | null
}

export const ModalMovementHistory: React.FC<ModalMovementHistoryProps> = ({ 
  isOpen, 
  onRequestClose, 
  item 
}) => {
  const { t } = useTranslation()
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  useEffect(() => {
    if (isOpen && item?._id) {
      fetchInventoryMovements(item._id)
        .then(res => setMovements(res))
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

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
      key: 'beforeAfter',
      header: t('inventory.stock'),
      render: (m: InventoryMovement) => `${m.beforeStock ?? '-'} → ${m.afterStock ?? '-'}`,
      align: 'center' as const,
      width: '18%'
    },
    {
      key: 'afterStock',
      header: t('inventory.reference', { defaultValue: 'Referencia' }),
      render: (m: InventoryMovement) => {
        if (!m.referenceType) return '-'
        const refType = m.referenceType === 'work_order'
          ? t('workOrders.workOrder', { defaultValue: 'Orden de trabajo' })
          : t('inventory.manualAdjustment', { defaultValue: 'Ajuste manual' })
        return `${refType}: ${m.referenceId ?? '-'}`
      },
      width: '25%'
    },
    {
        key: 'performedBy',
        header: t('common.user'),
        width: '30%'
    }
  ]

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('inventory.history')}: {item.name}</h2>
          <button onClick={onRequestClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.tableContainer}>
            <DataTable
                data={movements}
                columns={columns}
                emptyMessage={t('inventory.noMovementsFound')}
            />
          </div>
        </div>

        <div className={formButtonStyles.actions}>
          <button
            onClick={onRequestClose}
            className={formButtonStyles.cancelButton}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalMovementHistory

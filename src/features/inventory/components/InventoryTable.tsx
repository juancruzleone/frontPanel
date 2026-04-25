import React from "react"
import { useTranslation } from "react-i18next"
import DataTable from "../../../components/DataTable/DataTable"
import { InventoryItem } from "../types/inventory.types"
import { Edit, Trash, Package, History } from "lucide-react"
import Tooltip from "../../../shared/components/Tooltip/Tooltip"
import styles from "../styles/inventoryTable.module.css"

interface InventoryTableProps {
  items: InventoryItem[]
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
  onAdjust: (item: InventoryItem) => void
  onViewHistory: (item: InventoryItem) => void
  isAdmin: boolean
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, 
  onEdit, 
  onDelete, 
  onAdjust, 
  onViewHistory,
  isAdmin 
}) => {
  const { t } = useTranslation()

  const columns = [
    {
      key: 'name',
      header: t('inventory.name'),
      width: '25%'
    },
    {
      key: 'category',
      header: t('inventory.category'),
      width: '15%'
    },
    {
      key: 'stock',
      header: t('inventory.stock'),
      width: '10%',
      align: 'center' as const,
      render: (item: InventoryItem) => (
        <span className={item.currentStock <= item.minimumStock ? styles.lowStock : ''}>
          {item.currentStock} {item.unit}
        </span>
      )
    },
    {
        key: 'minStock',
        header: t('inventory.minimumStock'),
        width: '10%',
        align: 'center' as const,
        render: (item: InventoryItem) => item.minimumStock
    },
    {
      key: 'location',
      header: t('inventory.location'),
      width: '15%'
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: '25%',
      align: 'center' as const,
      render: (item: InventoryItem) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <Tooltip content={t('inventory.history')}>
            <button 
              onClick={() => onViewHistory(item)} 
              className={styles.actionButton}
              aria-label={t('inventory.history')}
            >
              <History size={18} />
            </button>
          </Tooltip>
          {isAdmin && (
            <>
              <Tooltip content={t('inventory.adjustStock')}>
                <button 
                  onClick={() => onAdjust(item)} 
                  className={`${styles.actionButton} ${styles.adjustButton}`}
                  aria-label={t('inventory.adjustStock')}
                >
                  <Package size={18} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.edit')}>
                <button 
                  onClick={() => onEdit(item)} 
                  className={`${styles.actionButton} ${styles.editButton}`}
                  aria-label={t('common.edit')}
                >
                  <Edit size={18} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.delete')}>
                <button 
                  onClick={() => onDelete(item)} 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  aria-label={t('common.delete')}
                >
                  <Trash size={18} />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <DataTable
      data={items}
      columns={columns}
      emptyMessage={t('inventory.noItemsFound')}
    />
  )
}


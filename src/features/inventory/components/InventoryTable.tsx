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
      header: t('inventory.availableStock'),
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
      key: 'stockStatus',
      header: t('inventory.stockStatus'),
      width: '12%',
      align: 'center' as const,
      render: (item: InventoryItem) => {
        const isLowStock = item.currentStock <= item.minimumStock

        return (
          <span className={`${styles.statusBadge} ${isLowStock ? styles.statusLow : styles.statusOk}`}>
            {isLowStock ? t('inventory.stockStatusLow') : t('inventory.stockStatusOk')}
          </span>
        )
      }
    },
    {
      key: 'location',
      header: t('inventory.location'),
      width: '13%',
      render: (item: InventoryItem) => item.location || '-'
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: '25%',
      align: 'center' as const,
      render: (item: InventoryItem) => {
        const hasInventoryItemId = item.inventorySource !== 'asset' && Boolean(item._id)
        const canManageStock = hasInventoryItemId || Boolean(item.assetId)

        return (
          <div className={styles.actionsGroup}>
            {hasInventoryItemId && (
              <Tooltip content={t('inventory.history')}>
                <button 
                  onClick={() => onViewHistory(item)} 
                  className={styles.actionButton}
                  aria-label={t('inventory.history')}
                >
                  <History size={18} />
                </button>
              </Tooltip>
            )}
            {isAdmin && canManageStock && (
              <Tooltip content={t('inventory.adjustStock')}>
                <button 
                  onClick={() => onAdjust(item)} 
                  className={styles.actionButton}
                  aria-label={t('inventory.adjustStock')}
                  title={t('inventory.adjustStock')}
                >
                  <Package size={18} />
                </button>
              </Tooltip>
            )}
            {isAdmin && hasInventoryItemId && (
              <>
                <Tooltip content={t('common.edit')}>
                  <button 
                    onClick={() => onEdit(item)} 
                    className={styles.actionButton}
                    aria-label={t('common.edit')}
                  >
                    <Edit size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={t('common.delete')}>
                  <button 
                    onClick={() => onDelete(item)} 
                    className={styles.actionButton}
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

import React from "react"
import { useTranslation } from "react-i18next"
import DataTable from "../../../components/DataTable/DataTable"
import { Edit, Trash } from "lucide-react"
import Tooltip from "../../../shared/components/Tooltip/Tooltip"

interface Supplier {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
}

interface SupplierTableProps {
  suppliers: Supplier[]
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
  isAdmin: boolean
}

export const SupplierTable: React.FC<SupplierTableProps> = ({ 
  suppliers, 
  onEdit, 
  onDelete, 
  isAdmin 
}) => {
  const { t } = useTranslation()

  const columns = [
    {
      key: 'name',
      header: t('suppliers.name'),
      width: '30%'
    },
    {
      key: 'contactName',
      header: t('suppliers.contactName'),
      width: '25%'
    },
    {
      key: 'email',
      header: t('suppliers.email'),
      width: '25%'
    },
    {
      key: 'actions',
      header: t('common.actions'),
      width: '20%',
      align: 'center' as const,
      render: (supplier: Supplier) => (
        <div className="flex gap-2 justify-center">
          {isAdmin && (
            <>
              <Tooltip content={t('common.edit')}>
                <button 
                  onClick={() => onEdit(supplier)} 
                  className="p-1 hover:bg-gray-100 rounded text-orange-600"
                  aria-label={t('common.edit')}
                >
                  <Edit size={18} />
                </button>
              </Tooltip>
              <Tooltip content={t('common.delete')}>
                <button 
                  onClick={() => onDelete(supplier)} 
                  className="p-1 hover:bg-gray-100 rounded text-red-600"
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
      data={suppliers}
      columns={columns}
      emptyMessage={t('suppliers.noSuppliersFound')}
    />
  )
}

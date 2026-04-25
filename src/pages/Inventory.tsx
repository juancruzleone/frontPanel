import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { InventoryTable } from "../features/inventory/components/InventoryTable"
import { InventoryForm } from "../features/inventory/components/InventoryForm"
import { StockAdjustmentModal } from "../features/inventory/components/StockAdjustmentModal"
import { MovementHistory } from "../features/inventory/components/MovementHistory"
import useInventory from "../features/inventory/hooks/useInventory"
import { InventoryItem } from "../features/inventory/types/inventory.types"
import { useAuthStore } from "../store/authStore"
import { Plus, FilterX, AlertTriangle, X } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import Modal from "react-modal"
import ModalSuccess from "../features/assets/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ConfirmModal from "../shared/components/ConfirmModal"
import Button from "../shared/components/Buttons/buttonCreate"
import styles from "../features/inventory/styles/inventory.module.css"

const Inventory = () => {
  const { t } = useTranslation()
  const { 
    items, 
    loading, 
    loadInventory, 
    addInventoryItem, 
    updateInventoryItem, 
    removeInventoryItem,
    adjustStock 
  } = useInventory()
  
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsStockModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadInventory({ name: value })
  }

  const handleOpenCreate = () => {
    setSelectedItem(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsEditModalOpen(true)
  }

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsStockModalOpen(true)
  }

  const handleOpenHistory = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsHistoryModalOpen(true)
  }

  const handleOpenDelete = (item: InventoryItem) => {
    setSelectedItem(item)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedItem?._id) return
    try {
      await removeInventoryItem(selectedItem._id)
      handleSuccess(t('inventory.itemDeleted'))
      setIsDeleteModalOpen(false)
    } catch (err: any) {
      setResponseMessage(err.message)
      setIsError(true)
    }
  }

  const handleSuccess = (message: string) => {
    setResponseMessage(message)
    setIsError(false)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
  }

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.currentStock <= item.minimumStock)
  }, [items])

  return (
    <div className={styles.containerInventory}>
      <div className={styles.topSection}>
        <div className={styles.headerWithToggle}>
          <h1 className={styles.title}>{t('inventory.title')}</h1>
        </div>
        {isAdmin && (
          <div className={styles.positionButton}>
            <Button title={t('inventory.addItem')} onClick={handleOpenCreate} />
          </div>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <div className={styles.lowStockAlert}>
          <div className={styles.alertHeader}>
            <AlertTriangle size={20} />
            <h2>{t('inventory.lowStockAlert')}</h2>
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '0.875rem' }}>
            {lowStockItems.slice(0, 5).map(item => (
              <li key={item._id}>
                {item.name}: {item.currentStock} {item.unit} ({t('inventory.minimum')}: {item.minimumStock})
              </li>
            ))}
            {lowStockItems.length > 5 && <li>{t('inventory.andMore', { count: lowStockItems.length - 5 })}</li>}
          </ul>
        </div>
      )}

      <div className={styles.searchRow}>
        <div className={styles.searchContainerInner}>
          <SearchInput
            placeholder={t('inventory.searchPlaceholder')}
            onInputChange={handleSearch}
            value={searchTerm}
          />
        </div>
        <button
          onClick={() => {
            setSearchTerm("");
            handleSearch("");
          }}
          className={styles.clearFilters}
          title={t('common.clearFilters')}
        >
          <FilterX size={20} />
        </button>
      </div>

      <div className={styles.listContainer}>
        <div className={styles.tableWrapper}>
          <InventoryTable 
            items={items} 
            isAdmin={isAdmin}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onAdjust={handleOpenAdjust}
            onViewHistory={handleOpenHistory}
          />
        </div>
      </div>

      {/* Modales */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('inventory.deleteItem')}
        message={t('inventory.deleteConfirmMessage', { name: selectedItem?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />
      
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onRequestClose={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
        className="max-w-lg w-full bg-white p-6 rounded-lg shadow-xl outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isEditModalOpen ? t('inventory.editItem') : t('inventory.addItem')}
          </h2>
          <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <InventoryForm 
          initialData={selectedItem}
          onCancel={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
          onSubmit={async (data) => {
            if (isEditModalOpen && selectedItem?._id) {
              await updateInventoryItem(selectedItem._id, data)
              handleSuccess(t('inventory.itemUpdated'))
            } else {
              await addInventoryItem(data)
              handleSuccess(t('inventory.itemAdded'))
            }
          }}
        />
      </Modal>

      <StockAdjustmentModal 
        isOpen={isAdjustModalOpen}
        onRequestClose={() => setIsStockModalOpen(false)}
        item={selectedItem}
        onAdjust={async (q, t, r) => {
            if (selectedItem?._id) {
                await adjustStock(selectedItem._id, q, t, r, selectedItem.currentStock)
                handleSuccess("Stock ajustado correctamente")
            }
        }}
      />

      <MovementHistory 
        isOpen={isHistoryModalOpen}
        onRequestClose={() => setIsHistoryModalOpen(false)}
        item={selectedItem}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
    </div>
  )
}

export default Inventory


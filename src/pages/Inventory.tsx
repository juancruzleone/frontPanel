import { useEffect, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { InventoryTable } from "../features/inventory/components/InventoryTable"
import ModalCreate from "../features/inventory/components/ModalCreate"
import ModalEdit from "../features/inventory/components/ModalEdit"
import ModalAdjustStock from "../features/inventory/components/ModalAdjustStock"
import ModalMovementHistory from "../features/inventory/components/ModalMovementHistory"
import useInventory from "../features/inventory/hooks/useInventory"
import { InventoryItem } from "../features/inventory/types/inventory.types"
import { useAuthStore } from "../store/authStore"
import { FilterX, AlertTriangle, Edit, History, Package, Trash } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import ModalSuccess from "../features/assets/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ConfirmModal from "../shared/components/ConfirmModal"
import Button from "../shared/components/Buttons/buttonCreate"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"
import Tooltip from "../shared/components/Tooltip/Tooltip"
import { WifiOff } from "lucide-react"
import { useInventoryTour } from "../features/inventory/hooks/useInventoryTour"
import TourButton from "../shared/components/Buttons/TourButton"
import Skeleton from "../shared/components/Skeleton"
import styles from "../features/inventory/styles/inventory.module.css"
import { CsvImportDialog } from "../shared/components/CsvImportDialog/CsvImportDialog"
import { canDownloadCsvTemplate, canExportCsv } from "../shared/utils/exportPermissions"
import { commitInventoryImport, downloadInventoryImportErrors, downloadInventoryTemplate, exportInventory, previewInventoryImport } from "../features/inventory/services/inventoryServices"

const INVENTORY_ALLOWED_VIEWS = ['cards', 'table'] as const

const Inventory = () => {
  const { t } = useTranslation()
  const { 
    items, 
    loadInventory, 
    removeInventoryItem,
    adjustStock,
    loading
  } = useInventory()
  
  const { tourCompleted, startTour, skipTour } = useInventoryTour()

  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'super_admin'
  const [viewMode, setViewMode, isMobile] = useResponsiveView('inventory-view', 'cards', {
    allowedViews: INVENTORY_ALLOWED_VIEWS,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsStockModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)

  const runCsvAction = async (action: () => Promise<void>) => {
    setCsvError(null)
    try { await action() } catch (caught) { setCsvError(caught instanceof Error ? caught.message : String(caught)) }
  }

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (!loading && !tourCompleted) {
      const timer = setTimeout(() => {
        startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tourCompleted, startTour])


  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadInventory({ name: value, category: selectedCategory })
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    loadInventory({ name: searchTerm, category: value })
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
    } catch (err) {
      setResponseMessage(err instanceof Error ? err.message : t('common.error'))
      setIsError(true)
    }
  }

  const handleSuccess = (message: string) => {
    setResponseMessage(message)
    setIsError(false)
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsStockModalOpen(false)
    loadInventory()
  }

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.currentStock <= item.minimumStock)
  }, [items])

  const categoryOptions = useMemo(() => {
    const categories = items
      .map((item) => item.category)
      .filter((category): category is string => Boolean(category?.trim()))

    return Array.from(new Set(categories))
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({ label: category, value: category }))
  }, [items])

  const closeAllModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsStockModalOpen(false)
    setIsHistoryModalOpen(false)
    setIsDeleteModalOpen(false)
  }

  return (
    <div className={styles.containerInventory}>
      <div className={styles.topSection}>
        <div className={styles.headerWithToggle}>
          <h1 className={styles.title} data-tour="inventory-title">{t('inventory.title')}</h1>
          {!navigator.onLine && (
            <div className={styles.offlineBadge} title={t('deviceForm.offline')}>
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}
          {!isMobile && (
            <ViewToggle
              view={viewMode}
              onViewChange={setViewMode}
              allowedViews={INVENTORY_ALLOWED_VIEWS}
            />
          )}
        </div>
        {isAdmin && (
          <div className={styles.positionButton}>
            <Button data-tour="inventory-add-btn" title={t('inventory.addItem')} onClick={handleOpenCreate} />
          </div>
        )}
      </div>

      {(isAdmin || canExportCsv(role)) && (
        <div className={styles.csvActionsRow}>
          {canDownloadCsvTemplate(role) && (
            <>
              <Button variant="secondary" title={t('inventory.csv.downloadTemplate')} onClick={() => runCsvAction(downloadInventoryTemplate)} />
              <Button variant="secondary" title={t('inventory.csv.import')} onClick={() => setIsImportOpen(true)} />
            </>
          )}
          {canExportCsv(role) && <Button variant="secondary" title={t('inventory.csv.exportFiltered')} onClick={() => runCsvAction(() => exportInventory({ name: searchTerm, category: selectedCategory }))} />}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className={styles.lowStockAlert} data-tour="inventory-low-stock">
          <div className={styles.alertHeader}>
            <AlertTriangle size={20} />
            <h2>{t('inventory.lowStockAlert')}</h2>
          </div>
          <ul className={styles.lowStockList}>
            {lowStockItems.slice(0, 5).map(item => (
              <li key={item._id || item.assetId || item.name}>
                {item.name}: {item.currentStock} {item.unit} ({t('inventory.minimum')}: {item.minimumStock})
              </li>
            ))}
            {lowStockItems.length > 5 && <li>{t('inventory.andMore', { count: lowStockItems.length - 5 })}</li>}
          </ul>
        </div>
      )}

      <div className={styles.searchRow}>
        <div className={styles.searchContainerInner} data-tour="inventory-search">
          <SearchInput
            placeholder={t('inventory.searchPlaceholder')}
            showSelect
            selectPlaceholder={t('inventory.filterByCategory')}
            selectOptions={categoryOptions}
            onInputChange={handleSearch}
            onSelectChange={handleCategoryChange}
            value={searchTerm}
            selectValue={selectedCategory}
          />
        </div>
        <button
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory("");
            loadInventory({ name: "", category: "" });
          }}
          className={styles.clearFilters}
          title={t('common.clearFilters')}
        >
          <FilterX size={20} />
        </button>
      </div>

      {csvError && <p role="alert" className={styles.errorMessage}>{csvError}</p>}

      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.skeletonGrid}>
              {[1, 2, 3, 4].map((_, i) => <Skeleton key={i} height={110} width={"100%"} style={{ borderRadius: 14 }} />)}
            </div>
          </div>
        ) : viewMode === 'table' ? (
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
        ) : items.length === 0 ? (
          <p className={styles.emptyMessage}>{t('inventory.noItemsFound')}</p>
        ) : (
          <div className={styles.cardsGrid}>
            {items.map((item) => {
              const hasInventoryItemId = item.inventorySource !== 'asset' && Boolean(item._id)
              const canManageStock = hasInventoryItemId || Boolean(item.assetId)
              const isLowStock = item.currentStock <= item.minimumStock

              return (
                <article key={item._id || item.assetId || item.name} className={styles.inventoryCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>{item.name}</h3>
                      <p className={styles.cardSubtitle}>{item.category || t('inventory.category')}</p>
                    </div>
                    <span className={`${styles.statusBadge} ${isLowStock ? styles.statusLow : styles.statusOk}`}>
                      {isLowStock ? t('inventory.stockStatusLow') : t('inventory.stockStatusOk')}
                    </span>
                  </div>

                  <div className={styles.cardDetails}>
                    <div>
                      <span>{t('inventory.availableStock')}</span>
                      <strong className={isLowStock ? styles.lowStockText : ''}>{item.currentStock} {item.unit}</strong>
                    </div>
                    <div>
                      <span>{t('inventory.minimumStock')}</span>
                      <strong>{item.minimumStock}</strong>
                    </div>
                    <div>
                      <span>{t('inventory.location')}</span>
                      <strong>{item.location || '-'}</strong>
                    </div>
                  </div>

                  {(hasInventoryItemId || (isAdmin && canManageStock)) && (
                    <div className={`${styles.cardActions} inventory-card-actions`}>
                      {hasInventoryItemId && (
                        <Tooltip content={t('inventory.history')}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => handleOpenHistory(item)}
                            aria-label={t('inventory.history')}
                          >
                            <History size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {isAdmin && canManageStock && (
                        <Tooltip content={t('inventory.adjustStock')}>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => handleOpenAdjust(item)}
                            aria-label={t('inventory.adjustStock')}
                          >
                            <Package size={20} />
                          </button>
                        </Tooltip>
                      )}
                      {isAdmin && hasInventoryItemId && (
                        <>
                          <Tooltip content={t('common.edit')}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => handleOpenEdit(item)}
                              aria-label={t('common.edit')}
                            >
                              <Edit size={20} />
                            </button>
                          </Tooltip>
                          <Tooltip content={t('common.delete')}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => handleOpenDelete(item)}
                              aria-label={t('common.delete')}
                            >
                              <Trash size={20} />
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
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
      
      <ModalCreate
        isOpen={isCreateModalOpen}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        item={selectedItem}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      <ModalAdjustStock 
        isOpen={isAdjustModalOpen}
        onRequestClose={() => setIsStockModalOpen(false)}
        item={selectedItem}
        onAdjust={async (q, adjType, r) => {
            if (selectedItem) {
                await adjustStock(selectedItem, q, adjType, r)
                handleSuccess(t('inventory.stockAdjusted')) // Fixed hardcoded string
            }
        }}
        onError={(message) => {
          setResponseMessage(message)
          setIsError(true)
        }}
      />

      <ModalMovementHistory 
        isOpen={isHistoryModalOpen}
        onRequestClose={() => setIsHistoryModalOpen(false)}
        item={selectedItem}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <CsvImportDialog
        guidance="inventory"
        isOpen={isImportOpen}
        title={t('inventory.csv.importTitle')}
        onClose={() => setIsImportOpen(false)}
        onPreview={previewInventoryImport}
        onCommit={commitInventoryImport}
        onDownloadErrors={downloadInventoryImportErrors}
        onDownloadTemplate={downloadInventoryTemplate}
        onCommitted={() => loadInventory({ name: searchTerm, category: selectedCategory })}
      />
      
      <TourButton
        onClick={tourCompleted ? startTour : skipTour}
        label={tourCompleted ? t('inventory.tour.buttons.restart') : t('inventory.tour.buttons.skip')}
      />
    </div>
  )
}

export default Inventory

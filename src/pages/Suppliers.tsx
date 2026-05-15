import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { SupplierTable } from "../features/suppliers/components/SupplierTable"
import { useSuppliers } from "../features/suppliers/hooks/useSuppliers"
import { useAuthStore } from "../store/authStore"
import { Edit, FilterX, Trash } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import Button from "../shared/components/Buttons/buttonCreate"
import ViewToggle from "../components/ViewToggle/ViewToggle"
import { useResponsiveView } from "../shared/hooks/useResponsiveView"
import Tooltip from "../shared/components/Tooltip/Tooltip"
import { useSuppliersTour } from "../features/suppliers/hooks/useSuppliersTour"
import TourButton from "../shared/components/Buttons/TourButton"
import styles from "../features/suppliers/styles/suppliers.module.css"

// New Modals
import ModalCreate from "../features/suppliers/components/ModalCreate"
import ModalEdit from "../features/suppliers/components/ModalEdit"
import ModalConfirmDelete from "../features/suppliers/components/ModalConfirmDelete"
import ModalSuccess from "../features/suppliers/components/ModalSuccess"
import type { Supplier } from "../store/supplierStore"

const SUPPLIERS_ALLOWED_VIEWS = ['cards', 'table'] as const

const Suppliers = () => {
  const { t } = useTranslation()
  const { 
    suppliers, 
    loadSuppliers,
    error,
    loading
  } = useSuppliers()
  
  const { tourCompleted, startTour, skipTour } = useSuppliersTour()

  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'super_admin'
  const [viewMode, setViewMode, isMobile] = useResponsiveView('suppliers-view', 'cards', {
    allowedViews: SUPPLIERS_ALLOWED_VIEWS,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

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
    loadSuppliers({ name: value })
  }

  const handleOpenCreate = () => {
    setSelectedSupplier(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsEditModalOpen(true)
  }

  const handleOpenDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteModalOpen(true)
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setIsSuccessModalOpen(true)
    loadSuppliers()
  }

  const closeAllModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setIsSuccessModalOpen(false)
    setSelectedSupplier(null)
  }

  return (
    <div className={styles.containerSuppliers}>
      <div className={styles.topSection}>
        <div className={styles.headerWithToggle}>
          <h1 className={styles.title} data-tour="suppliers-title">{t('suppliers.title')}</h1>
          {!isMobile && (
            <ViewToggle
              view={viewMode}
              onViewChange={setViewMode}
              allowedViews={SUPPLIERS_ALLOWED_VIEWS}
            />
          )}
        </div>
        {isAdmin && (
          <div className={styles.positionButton}>
            <Button data-tour="suppliers-add-btn" title={t('suppliers.addSupplier')} onClick={handleOpenCreate} />
          </div>
        )}
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchContainerInner} data-tour="suppliers-search">
          <SearchInput
            placeholder={t('suppliers.searchPlaceholder')}
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

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.listContainer}>
        {viewMode === 'table' ? (
          <div className={styles.tableWrapper}>
            <SupplierTable 
              suppliers={suppliers} 
              isAdmin={isAdmin}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          </div>
        ) : suppliers.length === 0 ? (
          <p className={styles.emptyMessage}>{t('suppliers.noSuppliersFound')}</p>
        ) : (
          <div className={styles.cardsGrid}>
            {suppliers.map((supplier) => (
              <article key={supplier._id} className={styles.supplierCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{supplier.name}</h3>
                    <p className={styles.cardSubtitle}>{supplier.contactName || t('suppliers.contactName')}</p>
                  </div>
                </div>

                <div className={styles.cardDetails}>
                  <div>
                    <span>{t('suppliers.email')}</span>
                    <strong>{supplier.email || '-'}</strong>
                  </div>
                  <div>
                    <span>{t('suppliers.phone')}</span>
                    <strong>{supplier.phone || '-'}</strong>
                  </div>
                </div>

                {isAdmin && (
                  <div className={`${styles.cardActions} supplier-card-actions`}>
                    <Tooltip content={t('common.edit')}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => handleOpenEdit(supplier)}
                        aria-label={t('common.edit')}
                      >
                        <Edit size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip content={t('common.delete')}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => handleOpenDelete(supplier)}
                        aria-label={t('common.delete')}
                      >
                        <Trash size={20} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalCreate
        isOpen={isCreateModalOpen}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      <ModalEdit
        isOpen={isEditModalOpen}
        supplier={selectedSupplier}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      <ModalConfirmDelete
        isOpen={isDeleteModalOpen}
        supplier={selectedSupplier}
        onClose={closeAllModals}
        onSuccess={handleSuccess}
      />

      <ModalSuccess
        isOpen={isSuccessModalOpen}
        message={successMessage}
        onClose={closeAllModals}
      />
      
      <TourButton
        onClick={tourCompleted ? startTour : skipTour}
        label={tourCompleted ? t('suppliers.tour.buttons.restart') : t('suppliers.tour.buttons.skip')}
      />
    </div>
  )
}

export default Suppliers

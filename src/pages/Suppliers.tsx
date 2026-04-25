import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { SupplierTable } from "../features/suppliers/components/SupplierTable"
import { useSuppliers } from "../features/suppliers/hooks/useSuppliers"
import { useAuthStore } from "../store/authStore"
import { FilterX } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import Button from "../shared/components/Buttons/buttonCreate"
import styles from "../features/suppliers/styles/suppliers.module.css"

// New Modals
import ModalCreate from "../features/suppliers/components/ModalCreate"
import ModalEdit from "../features/suppliers/components/ModalEdit"
import ModalConfirmDelete from "../features/suppliers/components/ModalConfirmDelete"
import ModalSuccess from "../features/suppliers/components/ModalSuccess"

const Suppliers = () => {
  const { t } = useTranslation()
  const { 
    suppliers, 
    loadSuppliers, 
  } = useSuppliers()
  
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [searchTerm, setSearchTerm] = useState("")
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    loadSuppliers({ name: value })
  }

  const handleOpenCreate = () => {
    setSelectedSupplier(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (supplier: any) => {
    setSelectedSupplier(supplier)
    setIsEditModalOpen(true)
  }

  const handleOpenDelete = (supplier: any) => {
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
          <h1 className={styles.title}>{t('suppliers.title')}</h1>
        </div>
        {isAdmin && (
          <div className={styles.positionButton}>
            <Button title={t('suppliers.addSupplier')} onClick={handleOpenCreate} />
          </div>
        )}
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchContainerInner}>
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

      <div className={styles.listContainer}>
        <div className={styles.tableWrapper}>
          <SupplierTable 
            suppliers={suppliers} 
            isAdmin={isAdmin}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        </div>
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
    </div>
  )
}

export default Suppliers

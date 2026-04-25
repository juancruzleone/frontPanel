import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { SupplierTable } from "../features/suppliers/components/SupplierTable"
import { SupplierForm } from "../features/suppliers/components/SupplierForm"
import { useSuppliers } from "../features/suppliers/hooks/useSuppliers"
import { useAuthStore } from "../store/authStore"
import { Plus, FilterX, X } from "lucide-react"
import SearchInput from "../shared/components/Inputs/SearchInput"
import Modal from "react-modal"
import ModalSuccess from "../features/assets/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import ConfirmModal from "../shared/components/ConfirmModal"
import Button from "../shared/components/Buttons/buttonCreate"
import styles from "../features/suppliers/styles/suppliers.module.css"

const Suppliers = () => {
  const { t } = useTranslation()
  const { 
    suppliers, 
    loading, 
    loadSuppliers, 
    addSupplier, 
    updateSupplier, 
    removeSupplier 
  } = useSuppliers()
  
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)

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

  const handleDelete = async () => {
    if (!selectedSupplier?._id) return
    try {
      await removeSupplier(selectedSupplier._id)
      handleSuccess(t('suppliers.supplierDeleted'))
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

      {/* Modales */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onRequestClose={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
        className="max-w-lg w-full bg-white p-6 rounded-lg shadow-xl outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isEditModalOpen ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
          </h2>
          <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <SupplierForm 
          initialData={selectedSupplier}
          onCancel={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
          onSubmit={async (data) => {
            if (isEditModalOpen && selectedSupplier?._id) {
              await updateSupplier(selectedSupplier._id, data)
              handleSuccess(t('suppliers.supplierUpdated'))
            } else {
              await addSupplier(data)
              handleSuccess(t('suppliers.supplierAdded'))
            }
          }}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('suppliers.deleteSupplier')}
        message={t('suppliers.deleteConfirmMessage', { name: selectedSupplier?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
      />

      <ModalSuccess isOpen={!!responseMessage && !isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
      <ModalError isOpen={!!responseMessage && isError} onRequestClose={() => setResponseMessage("")} mensaje={responseMessage} />
    </div>
  )
}

export default Suppliers


import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus, Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useAssets from '../../assets/hooks/useAssets'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import EditModal from '../../../shared/components/EditModal'
import SuccessModal from '../../../shared/components/SuccessModal'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

interface EditingCategory {
  id: string
  nombre: string
}

const ModalManageAssetCategories = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { categories, loadAssets } = useAssets()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [editName, setEditName] = useState('')
  const [editValidationError, setEditValidationError] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAssets({ page: 1, limit: 100 })
      setValidationError('')
      setNewCategoryName('')
    }
  }, [isOpen])

  const validateCategoryName = (name: string): string => {
    if (!name.trim()) {
      return t('settings.validation.nameRequired')
    }
    if (name.trim().length < 2) {
      return t('settings.validation.nameTooShort')
    }
    if (name.trim().length > 50) {
      return t('settings.validation.nameTooLong')
    }
    const exists = categories.some(
      cat => cat.toLowerCase() === name.trim().toLowerCase()
    )
    if (exists) {
      return t('settings.validation.nameExists')
    }
    return ''
  }

  const handleAdd = async () => {
    const error = validateCategoryName(newCategoryName)
    if (error) {
      setValidationError(error)
      return
    }
    
    setIsAdding(true)
    setValidationError('')
    try {
      // Aquí deberías implementar la lógica para agregar categoría de activos
      setNewCategoryName('')
      await loadAssets({ page: 1, limit: 100 })
      setSuccessModal({
        title: t('settings.success.categoryAdded'),
        message: t('settings.success.categoryAddedMessage')
      })
    } catch (error) {
      setValidationError(t('settings.error.createFailed'))
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditClick = (category: string, index: number) => {
    setEditingCategory({ id: index.toString(), nombre: category })
    setEditName(category)
    setEditValidationError('')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    const error = validateCategoryName(editName)
    if (error) {
      setEditValidationError(error)
      return
    }

    setIsSaving(true)
    setEditValidationError('')
    try {
      // Aquí deberías implementar la función de actualización
      await loadAssets({ page: 1, limit: 100 })
      setIsEditModalOpen(false)
      setEditingCategory(null)
      setSuccessModal({
        title: t('settings.success.categoryUpdated'),
        message: t('settings.success.categoryUpdatedMessage')
      })
    } catch (error) {
      setEditValidationError(t('settings.error.updateFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (category: string, index: number) => {
    setDeleteConfirm({ id: index.toString(), name: category })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    
    setIsDeleting(true)
    try {
      // Aquí deberías implementar la función de eliminación
      await loadAssets({ page: 1, limit: 100 })
      setDeleteConfirm(null)
      setSuccessModal({
        title: t('settings.success.categoryDeleted'),
        message: t('settings.success.categoryDeletedMessage')
      })
    } catch (error) {
    } finally {
      setIsDeleting(false)
    }
  }

  const handleInputChange = (value: string) => {
    setNewCategoryName(value)
    if (validationError) {
      setValidationError('')
    }
  }

  const handleEditInputChange = (value: string) => {
    setEditName(value)
    if (editValidationError) {
      setEditValidationError('')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className={styles.modal}
      overlayClassName={styles.backdrop}
      ariaHideApp={false}
    >
      <div className={styles.modalHeader}>
        <h2>{t('settings.manageAssetCategories')}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          <X size={24} />
        </button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.addSection}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t('settings.newCategoryName')}
              className={`${styles.input} ${validationError ? styles.inputError : ''}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            {validationError && (
              <span className={styles.errorMessage}>{validationError}</span>
            )}
          </div>
          <button onClick={handleAdd} disabled={isAdding} className={styles.addButton}>
            <Plus size={20} />
          </button>
        </div>

        <div className={styles.itemsList}>
          {categories.map((category, index) => (
            <div key={index} className={styles.item}>
              <span>{category}</span>
              <div className={styles.itemActions}>
                <button
                  onClick={() => handleEditClick(category, index)}
                  className={styles.editButton}
                  title={t('common.edit')}
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(category, index)}
                  className={styles.deleteButton}
                  title={t('common.delete')}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        title={t('settings.editCategory')}
        isLoading={isSaving}
      >
        <div className={styles.editForm}>
          <label className={styles.label}>{t('settings.categoryName')}</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => handleEditInputChange(e.target.value)}
            className={`${styles.input} ${editValidationError ? styles.inputError : ''}`}
            placeholder={t('settings.categoryName')}
          />
          {editValidationError && (
            <span className={styles.errorMessage}>{editValidationError}</span>
          )}
        </div>
      </EditModal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onRequestClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={t('settings.confirmDeleteTitle')}
        message={t('settings.confirmDeleteMessage', { name: deleteConfirm?.name })}
        confirmText={t('common.delete')}
        isLoading={isDeleting}
        variant="danger"
      />

      <SuccessModal
        isOpen={!!successModal}
        onRequestClose={() => setSuccessModal(null)}
        title={successModal?.title || ''}
        message={successModal?.message || ''}
      />
    </Modal>
  )
}

export default ModalManageAssetCategories

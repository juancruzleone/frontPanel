import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus, Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useForms from '../../forms/hooks/useForms'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import EditModal from '../../../shared/components/EditModal'
import SuccessModal from '../../../shared/components/SuccessModal'
import validationService from '../services/validationService'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

interface EditingCategory {
  id: string
  nombre: string
}

const ModalManageFormCategories = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { categories, loadCategories } = useForms()
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
      loadCategories()
      setValidationError('')
      setNewCategoryName('')
    }
  }, [isOpen])

  // Validación básica local para feedback inmediato
  const validateCategoryNameLocal = (name: string): string => {
    if (!name.trim()) {
      return t('settings.validation.nameRequired')
    }
    return ''
  }

  // Validación completa con el backend
  const validateCategoryNameWithBackend = async (name: string, excludeId?: string): Promise<string> => {
    const localError = validateCategoryNameLocal(name)
    if (localError) return localError

    try {
      const result = await validationService.validateFormCategory(
        { nombre: name.trim() },
        excludeId
      )
      
      if (!result.valid && result.errors && result.errors.length > 0) {
        return result.errors[0].message
      }
      
      return ''
    } catch (error: any) {
      return error.response?.data?.message || t('settings.error.validationFailed')
    }
  }

  const handleAdd = async () => {
    // Validación local inmediata
    const localError = validateCategoryNameLocal(newCategoryName)
    if (localError) {
      setValidationError(localError)
      return
    }
    
    setIsAdding(true)
    setValidationError('')
    
    try {
      // Validación con backend antes de crear
      const backendError = await validateCategoryNameWithBackend(newCategoryName)
      if (backendError) {
        setValidationError(backendError)
        setIsAdding(false)
        return
      }

      // Aquí deberías implementar la lógica para agregar categoría de formularios
      setNewCategoryName('')
      await loadCategories()
      setSuccessModal({
        title: t('settings.success.categoryAdded'),
        message: t('settings.success.categoryAddedMessage')
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('settings.error.createFailed')
      setValidationError(errorMessage)
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
    // Validación local inmediata
    const localError = validateCategoryNameLocal(editName)
    if (localError) {
      setEditValidationError(localError)
      return
    }

    setIsSaving(true)
    setEditValidationError('')
    
    try {
      // Validación con backend antes de actualizar
      const backendError = await validateCategoryNameWithBackend(editName, editingCategory?.id)
      if (backendError) {
        setEditValidationError(backendError)
        setIsSaving(false)
        return
      }

      // Aquí deberías implementar la función de actualización
      await loadCategories()
      setIsEditModalOpen(false)
      setEditingCategory(null)
      setSuccessModal({
        title: t('settings.success.categoryUpdated'),
        message: t('settings.success.categoryUpdatedMessage')
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('settings.error.updateFailed')
      setEditValidationError(errorMessage)
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
      await loadCategories()
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
        <h2>{t('settings.manageFormCategories')}</h2>
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

export default ModalManageFormCategories

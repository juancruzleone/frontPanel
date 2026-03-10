import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus, Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useCategories from '../../installations/hooks/useCategories'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import EditModal from '../../../shared/components/EditModal'
import SuccessModal from '../../../shared/components/SuccessModal'
import Tooltip from '../../../shared/components/Tooltip/Tooltip'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

interface EditingCategory {
  id: string
  nombre: string
}

const ModalManageDeviceCategories = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { categories, loadCategories, addCategory, removeCategory } = useCategories()
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

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      loadCategories()
      setValidationError('')
      setNewCategoryName('')
      setTouchedFields({})
    }
  }, [isOpen])

  // Validación básica local para feedback inmediato
  const validateCategoryNameLocal = (name: string): string => {
    if (!name.trim()) {
      return t('settings.validation.nameRequired')
    }
    if (name.trim().length < 2) {
      return t('settings.validation.nameTooShort')
    }
    if (name.trim().length > 50) {
      return t('settings.validation.nameTooLong')
    }
    return ''
  }

  // Validación de duplicados localmente
  const checkDuplicateName = (name: string, excludeId?: string): string => {
    const exists = categories.some(
      cat => cat._id !== excludeId && cat.nombre.toLowerCase() === name.trim().toLowerCase()
    )
    if (exists) {
      return t('settings.validation.nameExists')
    }
    return ''
  }

  const handleInputChange = (value: string) => {
    setNewCategoryName(value)
    if (validationError && touchedFields.newCategory) {
      const localError = validateCategoryNameLocal(value)
      setValidationError(localError)
    }
  }

  const handleInputBlur = () => {
    setTouchedFields(prev => ({ ...prev, newCategory: true }))
    
    if (!newCategoryName.trim()) {
      setValidationError(t('settings.validation.nameRequired'))
      return
    }

    const localError = validateCategoryNameLocal(newCategoryName)
    if (localError) {
      setValidationError(localError)
      return
    }

    // Validar duplicados localmente
    const duplicateError = checkDuplicateName(newCategoryName)
    setValidationError(duplicateError)
  }

  const handleAdd = async () => {
    // Marcar campo como tocado
    setTouchedFields(prev => ({ ...prev, newCategory: true }))
    
    // Validación local inmediata
    const localError = validateCategoryNameLocal(newCategoryName)
    if (localError) {
      setValidationError(localError)
      return
    }
    
    // Validar duplicados
    const duplicateError = checkDuplicateName(newCategoryName)
    if (duplicateError) {
      setValidationError(duplicateError)
      return
    }
    
    setIsAdding(true)
    setValidationError('')
    
    try {
      await addCategory({ nombre: newCategoryName.trim() })
      setNewCategoryName('')
      setTouchedFields({})
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

  const handleEditClick = (category: any) => {
    setEditingCategory({ id: category._id, nombre: category.nombre })
    setEditName(category.nombre)
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

    // Validar duplicados
    const duplicateError = checkDuplicateName(editName, editingCategory?.id)
    if (duplicateError) {
      setEditValidationError(duplicateError)
      return
    }

    setIsSaving(true)
    setEditValidationError('')
    
    try {
      // Aquí deberías implementar la función de actualización en el hook
      // await updateCategory(editingCategory!.id, { nombre: editName.trim() })
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

  const handleDeleteClick = (category: any) => {
    setDeleteConfirm({ id: category._id, name: category.nombre })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    
    setIsDeleting(true)
    try {
      await removeCategory(deleteConfirm.id)
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
        <h2>{t('settings.manageDeviceCategories')}</h2>
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
              onBlur={handleInputBlur}
              placeholder={t('settings.newCategoryName')}
              className={`${styles.input} ${validationError && touchedFields.newCategory ? styles.inputError : ''}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            {validationError && touchedFields.newCategory && (
              <span className={styles.errorMessage}>{validationError}</span>
            )}
          </div>
          <button onClick={handleAdd} disabled={isAdding} className={styles.addButton}>
            <Plus size={20} />
          </button>
        </div>

        <div className={styles.itemsList}>
          {categories.map((category) => (
            <div key={category._id} className={styles.item}>
              <span>{category.nombre}</span>
              <div className={styles.itemActions}>
                <Tooltip content={t('common.edit')}>
                  <button
                    onClick={() => handleEditClick(category)}
                    className={styles.editButton}
                    aria-label={t('common.edit')}
                  >
                    <Edit2 size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={t('common.delete')}>
                  <button
                    onClick={() => handleDeleteClick(category)}
                    className={styles.deleteButton}
                    aria-label={t('common.delete')}
                  >
                    <Trash size={18} />
                  </button>
                </Tooltip>
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
        <div className={styles.formGroup}>
          <label>{t('settings.categoryName')} *</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => handleEditInputChange(e.target.value)}
            className={editValidationError ? styles.inputError : ''}
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

export default ModalManageDeviceCategories

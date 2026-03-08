import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus, Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useInstallationTypes from '../../installations/hooks/useInstallationTypes'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import EditModal from '../../../shared/components/EditModal'
import SuccessModal from '../../../shared/components/SuccessModal'
import Tooltip from '../../../shared/components/Tooltip/Tooltip'
import validationService from '../services/validationService'

interface Props {
  isOpen: boolean
  onRequestClose: () => void
}

interface EditingType {
  id: string
  nombre: string
}

const ModalManageInstallationTypes = ({ isOpen, onRequestClose }: Props) => {
  const { t } = useTranslation()
  const { installationTypes, loadInstallationTypes, removeInstallationType, addInstallationType } = useInstallationTypes()
  const [newTypeName, setNewTypeName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [editingType, setEditingType] = useState<EditingType | null>(null)
  const [editName, setEditName] = useState('')
  const [editValidationError, setEditValidationError] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadInstallationTypes()
      setValidationError('')
      setNewTypeName('')
    }
  }, [isOpen])

  // Validación básica local para feedback inmediato
  const validateTypeNameLocal = (name: string): string => {
    if (!name.trim()) {
      return t('settings.validation.nameRequired')
    }
    return ''
  }

  // Validación completa con el backend
  const validateTypeNameWithBackend = async (name: string, excludeId?: string): Promise<string> => {
    const localError = validateTypeNameLocal(name)
    if (localError) return localError

    try {
      const result = await validationService.validateInstallationType(
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
    const localError = validateTypeNameLocal(newTypeName)
    if (localError) {
      setValidationError(localError)
      return
    }
    
    setIsAdding(true)
    setValidationError('')
    
    try {
      // Validación con backend antes de crear
      const backendError = await validateTypeNameWithBackend(newTypeName)
      if (backendError) {
        setValidationError(backendError)
        setIsAdding(false)
        return
      }

      await addInstallationType({ nombre: newTypeName.trim() })
      setNewTypeName('')
      await loadInstallationTypes()
      setSuccessModal({
        title: t('settings.success.typeAdded'),
        message: t('settings.success.typeAddedMessage')
      })
    } catch (error: any) {
      // El backend puede devolver errores de validación adicionales
      const errorMessage = error.response?.data?.message || t('settings.error.createFailed')
      setValidationError(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditClick = (type: any) => {
    setEditingType({ id: type._id, nombre: type.nombre })
    setEditName(type.nombre)
    setEditValidationError('')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    // Validación local inmediata
    const localError = validateTypeNameLocal(editName)
    if (localError) {
      setEditValidationError(localError)
      return
    }

    setIsSaving(true)
    setEditValidationError('')
    
    try {
      // Validación con backend antes de actualizar
      const backendError = await validateTypeNameWithBackend(editName, editingType?.id)
      if (backendError) {
        setEditValidationError(backendError)
        setIsSaving(false)
        return
      }

      // Aquí deberías implementar la función de actualización en el hook
      // await updateInstallationType(editingType!.id, { nombre: editName.trim() })
      await loadInstallationTypes()
      setIsEditModalOpen(false)
      setEditingType(null)
      setSuccessModal({
        title: t('settings.success.typeUpdated'),
        message: t('settings.success.typeUpdatedMessage')
      })
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('settings.error.updateFailed')
      setEditValidationError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (type: any) => {
    setDeleteConfirm({ id: type._id, name: type.nombre })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    
    setIsDeleting(true)
    try {
      await removeInstallationType(deleteConfirm.id)
      await loadInstallationTypes()
      setDeleteConfirm(null)
      setSuccessModal({
        title: t('settings.success.typeDeleted'),
        message: t('settings.success.typeDeletedMessage')
      })
    } catch (error) {
    } finally {
      setIsDeleting(false)
    }
  }

  const handleInputChange = (value: string) => {
    setNewTypeName(value)
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
        <h2>{t('settings.manageInstallationTypes')}</h2>
        <button onClick={onRequestClose} className={styles.closeButton}>
          <X size={24} />
        </button>
      </div>

      <div className={styles.modalBody}>
        <div className={styles.addSection}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t('settings.newTypeName')}
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
          {installationTypes.map((type) => (
            <div key={type._id} className={styles.item}>
              <span>{type.nombre}</span>
              <div className={styles.itemActions}>
                <Tooltip content={t('common.edit')}>
                  <button
                    onClick={() => handleEditClick(type)}
                    className={styles.editButton}
                    aria-label={t('common.edit')}
                  >
                    <Edit2 size={18} />
                  </button>
                </Tooltip>
                <Tooltip content={t('common.delete')}>
                  <button
                    onClick={() => handleDeleteClick(type)}
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
        title={t('settings.editType')}
        isLoading={isSaving}
      >
        <div className={styles.editForm}>
          <label className={styles.label}>{t('settings.typeName')}</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => handleEditInputChange(e.target.value)}
            className={`${styles.input} ${editValidationError ? styles.inputError : ''}`}
            placeholder={t('settings.typeName')}
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

export default ModalManageInstallationTypes

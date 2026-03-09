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
  const { installationTypes, loadInstallationTypes, removeInstallationType, addInstallationType, updateInstallationType } = useInstallationTypes()
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
  const [touched, setTouched] = useState(false)

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      loadInstallationTypes()
      setValidationError('')
      setNewTypeName('')
      setTouchedFields({})
    }
  }, [isOpen])

  // Validación básica local para feedback inmediato
  const validateTypeNameLocal = (name: string): string => {
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

  const handleInputChange = (value: string) => {
    setNewTypeName(value)
    if (validationError && touchedFields.newType) {
      const localError = validateTypeNameLocal(value)
      setValidationError(localError)
    }
  }

  const handleInputBlur = async () => {
    setTouchedFields(prev => ({ ...prev, newType: true }))
    
    if (!newTypeName.trim()) {
      setValidationError(t('settings.validation.nameRequired'))
      return
    }

    const localError = validateTypeNameLocal(newTypeName)
    if (localError) {
      setValidationError(localError)
      return
    }

    // Validar con backend
    const backendError = await validateTypeNameWithBackend(newTypeName)
    setValidationError(backendError)
  }

  const handleAdd = async () => {
    // Marcar campo como tocado
    setTouchedFields(prev => ({ ...prev, newType: true }))
    
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
      setTouchedFields({})
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
    setTouched(false)
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

      // Actualizar el tipo de instalación
      await updateInstallationType(editingType!.id, { nombre: editName.trim() })
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

  const handleEditInputChange = (value: string) => {
    setEditName(value)
    // Limpiar error cuando el usuario empieza a escribir
    if (editValidationError && touched) {
      setEditValidationError('')
    }
  }

  const handleEditInputBlur = () => {
    setTouched(true)
    
    // Validación local inmediata
    if (editName.trim() === '') {
      setEditValidationError(t('settings.validation.nameRequired'))
      return
    }
    
    // Si el nombre no ha cambiado, no validar
    if (editName.trim() === editingType?.nombre) {
      setEditValidationError('')
      return
    }

    // Validar longitud mínima
    if (editName.trim().length < 2) {
      setEditValidationError(t('settings.validation.nameTooShort'))
      return
    }

    // Validar longitud máxima
    if (editName.trim().length > 50) {
      setEditValidationError(t('settings.validation.nameTooLong'))
      return
    }

    // Validar duplicados localmente
    const exists = installationTypes.some(
      type => type._id !== editingType?.id && type.nombre.toLowerCase() === editName.trim().toLowerCase()
    )
    if (exists) {
      setEditValidationError(t('settings.validation.nameExists'))
      return
    }

    // Si pasa todas las validaciones locales, limpiar error
    setEditValidationError('')
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
              onBlur={handleInputBlur}
              placeholder={t('settings.newTypeName')}
              className={`${styles.input} ${validationError && touchedFields.newType ? styles.inputError : ''}`}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            {validationError && touchedFields.newType && (
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
        <div className={styles.formGroup}>
          <label>{t('settings.typeName')} *</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => handleEditInputChange(e.target.value)}
            onBlur={handleEditInputBlur}
            className={editValidationError ? styles.inputError : ''}
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

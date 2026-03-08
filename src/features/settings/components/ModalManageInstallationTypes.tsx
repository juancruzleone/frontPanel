import { useEffect, useState } from 'react'
import Modal from 'react-modal'
import { X, Trash, Plus, Edit2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../styles/modalManage.module.css'
import useInstallationTypes from '../../installations/hooks/useInstallationTypes'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import EditModal from '../../../shared/components/EditModal'
import SuccessModal from '../../../shared/components/SuccessModal'

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

  const validateTypeName = (name: string): string => {
    if (!name.trim()) {
      return t('settings.validation.nameRequired')
    }
    if (name.trim().length < 2) {
      return t('settings.validation.nameTooShort')
    }
    if (name.trim().length > 50) {
      return t('settings.validation.nameTooLong')
    }
    const exists = installationTypes.some(
      type => type.nombre.toLowerCase() === name.trim().toLowerCase() && 
      type._id !== editingType?.id
    )
    if (exists) {
      return t('settings.validation.nameExists')
    }
    return ''
  }

  const handleAdd = async () => {
    const error = validateTypeName(newTypeName)
    if (error) {
      setValidationError(error)
      return
    }
    
    setIsAdding(true)
    setValidationError('')
    try {
      await addInstallationType({ nombre: newTypeName.trim() })
      setNewTypeName('')
      await loadInstallationTypes()
      setSuccessModal({
        title: t('settings.success.typeAdded'),
        message: t('settings.success.typeAddedMessage')
      })
    } catch (error) {
      setValidationError(t('settings.error.createFailed'))
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
    const error = validateTypeName(editName)
    if (error) {
      setEditValidationError(error)
      return
    }

    setIsSaving(true)
    setEditValidationError('')
    try {
      // Aquí deberías implementar la función de actualización en el hook
      // await updateInstallationType(editingType!.id, { nombre: editName.trim() })
      await loadInstallationTypes()
      setIsEditModalOpen(false)
      setEditingType(null)
      setSuccessModal({
        title: t('settings.success.typeUpdated'),
        message: t('settings.success.typeUpdatedMessage')
      })
    } catch (error) {
      setEditValidationError(t('settings.error.updateFailed'))
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
                <button
                  onClick={() => handleEditClick(type)}
                  className={styles.editButton}
                  title={t('common.edit')}
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(type)}
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

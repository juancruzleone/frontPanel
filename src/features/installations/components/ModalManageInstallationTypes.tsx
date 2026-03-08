import React, { useEffect, useState } from 'react'
import { X, Edit, Trash, AlertTriangle, Plus } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { useTranslation } from 'react-i18next'
import useInstallationTypes, { InstallationType } from '../hooks/useInstallationTypes'
import ModalSuccess from './ModalSuccess'
import ModalConfirmDelete from './ModalConfirmDelete'

interface ModalManageInstallationTypesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalManageInstallationTypes: React.FC<ModalManageInstallationTypesProps> = ({
  isOpen,
  onRequestClose,
}) => {
  const { t } = useTranslation()
  const {
    installationTypes,
    loading,
    error,
    loadInstallationTypes,
    updateInstallationType,
    removeInstallationType
  } = useInstallationTypes()

  const [editingType, setEditingType] = useState<InstallationType | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<InstallationType>>({})
  // const [isEditing, setIsEditing] = useState(false) // Not really needed if we check editingType
  const [deletingType, setDeletingType] = useState<InstallationType | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadInstallationTypes(true) // Include inactive
    }
  }, [isOpen, loadInstallationTypes])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleEdit = (type: InstallationType) => {
    setEditingType(type)
    setEditFormData({
      nombre: type.nombre,
      descripcion: type.descripcion,
      activo: type.activo,
    })
  }

  const handleCancelEdit = () => {
    setEditingType(null)
    setEditFormData({})
  }

  const handleSaveEdit = async () => {
    if (!editingType?._id) return

    try {
      await updateInstallationType(editingType._id, editFormData)
      handleCancelEdit()
      setSuccessMessage(t('installations.typeUpdatedSuccess'))
    } catch (err: any) {
    }
  }

  const handleDelete = (type: InstallationType) => {
    if (!type._id) return
    setDeletingType(type)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deletingType?._id) return

    try {
      await removeInstallationType(deletingType._id)
      setSuccessMessage(t('installations.typeDeletedSuccess'))
      setShowDeleteConfirm(false)
      setDeletingType(null)
    } catch (err: any) {
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingType(null)
  }

  const handleClose = () => {
    handleCancelEdit()
    setShowDeleteConfirm(false)
    setDeletingType(null)
    setSuccessMessage("")
    onRequestClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90%" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.manageInstallationTypes')}</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text)" }}>
              <div className={styles.spinner}></div>
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {installationTypes.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>{t('installations.noInstallationTypesCreated')}</p>
                  <p className={styles.emptyStateSubtext}>
                    {t('installations.installationTypesWillAppearHere')}
                  </p>
                </div>
              ) : (
                <div className={styles.listContainer}>
                  {installationTypes.map((type) => (
                    <div key={type._id} className={styles.listItem}>
                      {editingType?._id === type._id ? (
                        <div className={styles.editFormContent}>
                          <div className={styles.editFormGroup}>
                            <label>{t('installations.typeName')}</label>
                            <input
                              type="text"
                              value={editFormData.nombre || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                            />
                          </div>
                          <div className={styles.editFormGroup}>
                            <label>{t('installations.typeDescription')}</label>
                            <textarea
                              value={editFormData.descripcion || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                            />
                          </div>
                          <div className={styles.editFormGroup}>
                            <div className={styles.checkboxGroup}>
                              <input
                                type="checkbox"
                                checked={editFormData.activo ?? true}
                                onChange={(e) => setEditFormData({ ...editFormData, activo: e.target.checked })}
                              />
                              <span>{t('installations.active')}</span>
                            </div>
                          </div>
                          <div className={formButtonStyles.actions}>
                            <button
                              onClick={handleSaveEdit}
                              className={formButtonStyles.submitButton}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={formButtonStyles.cancelButton}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.itemInfo}>
                            <h3 className={styles.itemTitle}>{type.nombre}</h3>
                            {type.descripcion && (
                              <p className={styles.itemDescription}>{type.descripcion}</p>
                            )}
                            <div className={styles.itemMeta}>
                              <span className={`${styles.itemStatus} ${type.activo ? styles.active : styles.inactive}`}>
                                {type.activo ? t('installations.active') : t('installations.inactive')}
                              </span>
                              <span className={styles.itemDate}>
                                {t('installations.created')}: {formatDate(type.fechaCreacion)}
                              </span>
                            </div>
                          </div>

                          <div className={styles.itemActions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleEdit(type)}
                              aria-label={t('installations.editInstallationType')}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleDelete(type)}
                              aria-label={t('installations.deleteInstallationType')}
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>


      </div>

      <ModalConfirmDelete
        isOpen={showDeleteConfirm}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title={deletingType ? t('installations.confirmDeleteType', { name: deletingType.nombre }) : ""}
        description={t('installations.deleteTypeWarning')}
      />

      {/* Modal de éxito */}
      <ModalSuccess
        isOpen={!!successMessage}
        onRequestClose={() => setSuccessMessage("")}
        mensaje={successMessage}
      />
    </div>
  )
}

export default ModalManageInstallationTypes 
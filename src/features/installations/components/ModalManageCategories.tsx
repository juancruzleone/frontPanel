import React, { useEffect, useState } from 'react'
import { X, Edit, Trash, AlertTriangle } from 'lucide-react'
import styles from '../styles/Modal.module.css'
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { useTranslation } from 'react-i18next'
import useCategories, { Category } from '../hooks/useCategories'
import ModalSuccess from './ModalSuccess'
import ModalConfirmDelete from './ModalConfirmDelete'

interface ModalManageCategoriesProps {
  isOpen: boolean
  onRequestClose: () => void
}

const ModalManageCategories: React.FC<ModalManageCategoriesProps> = ({
  isOpen,
  onRequestClose,
}) => {
  const { t } = useTranslation()
  const {
    categories,
    loading,
    error,
    loadCategories,
    updateCategory,
    removeCategory
  } = useCategories()

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Category>>({})
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadCategories(true)
    }
  }, [isOpen, loadCategories])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setEditFormData({
      nombre: category.nombre,
      descripcion: category.descripcion,
      activa: category.activa,
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditFormData({})
  }

  const handleSaveEdit = async () => {
    if (!editingCategory?._id) return

    try {
      await updateCategory(editingCategory._id, editFormData)
      handleCancelEdit()
      setSuccessMessage(t('installations.categoryUpdatedSuccess'))
      loadCategories(true)
    } catch (err: any) {
      console.error("Error al actualizar categoría:", err)
    }
  }

  const handleDelete = (category: Category) => {
    if (!category._id) return
    setDeletingCategory(category)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory?._id) return

    try {
      await removeCategory(deletingCategory._id)
      setSuccessMessage(t('installations.categoryDeletedSuccess'))
      setShowDeleteConfirm(false)
      setDeletingCategory(null)
      loadCategories(true)
    } catch (err: any) {
      console.error("Error al eliminar categoría:", err)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingCategory(null)
  }

  const handleClose = () => {
    handleCancelEdit()
    setShowDeleteConfirm(false)
    setDeletingCategory(null)
    setSuccessMessage("")
    onRequestClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "90%" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('installations.deviceCategories')}</h2>
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
              {categories.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>{t('installations.noDeviceCategoriesCreated')}</p>
                  <p className={styles.emptyStateSubtext}>
                    {t('installations.categoriesWillAppearHere')}
                  </p>
                </div>
              ) : (
                <div className={styles.listContainer}>
                  {categories.map((category) => (
                    <div key={category._id} className={styles.listItem}>
                      {editingCategory?._id === category._id ? (
                        <div className={styles.editFormContent}>
                          <div className={styles.editFormGroup}>
                            <label>{t('installations.categoryName')}</label>
                            <input
                              type="text"
                              value={editFormData.nombre || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                            />
                          </div>
                          <div className={styles.editFormGroup}>
                            <label>{t('installations.categoryDescription')}</label>
                            <textarea
                              value={editFormData.descripcion || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                            />
                          </div>
                          <div className={styles.editFormGroup}>
                            <div className={styles.checkboxGroup}>
                              <input
                                type="checkbox"
                                checked={editFormData.activa ?? true}
                                onChange={(e) => setEditFormData({ ...editFormData, activa: e.target.checked })}
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
                            <h3 className={styles.itemTitle}>{category.nombre}</h3>
                            {category.descripcion && (
                              <p className={styles.itemDescription}>{category.descripcion}</p>
                            )}
                            <div className={styles.itemMeta}>
                              <span className={`${styles.itemStatus} ${category.activa ? styles.active : styles.inactive}`}>
                                {category.activa ? t('installations.active') : t('installations.inactive')}
                              </span>
                              {/* Assuming createdAt is possibly present or we skip date */}
                              {/* <span className={styles.itemDate}>
                                {t('installations.created')}: {formatDate((category as any).createdAt)}
                              </span> */}
                            </div>
                          </div>

                          <div className={styles.itemActions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleEdit(category)}
                              aria-label={t('installations.editCategory')}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleDelete(category)}
                              aria-label={t('installations.deleteCategory')}
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
        title={deletingCategory ? t('installations.confirmDeleteCategory', { name: deletingCategory.nombre }) : ""}
        description={t('installations.deleteCategoryWarning')}
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

export default ModalManageCategories 
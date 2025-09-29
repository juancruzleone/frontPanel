import { useEffect, useState } from "react"
import { Edit, Trash, Plus, AlertTriangle } from "lucide-react"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import useFormCategories from "../hooks/useFormCategories"
import type { FormCategory } from "../hooks/useFormCategories"
import { useTranslation } from "react-i18next"

interface ModalManageCategoriesProps {
  isOpen: boolean
  onRequestClose: () => void
  onCategoryCreated: (message: string) => void
}

const ModalManageCategories = ({
  isOpen,
  onRequestClose,
  onCategoryCreated,
}: ModalManageCategoriesProps) => {
  const { t } = useTranslation()
  const {
    categories,
    loading,
    error,
    loadCategories,
    removeCategory,
    updateCategory,
  } = useFormCategories()

  const [editingCategory, setEditingCategory] = useState<FormCategory | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<FormCategory>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<FormCategory | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen, loadCategories])

  const handleEdit = (category: FormCategory) => {
    setEditingCategory(category)
    setEditFormData({
      nombre: category.nombre,
      descripcion: category.descripcion,
      activa: category.activa,
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditFormData({})
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory?._id) return

    try {
      await updateCategory(editingCategory._id, editFormData)
      await loadCategories()
      handleCancelEdit()
      onCategoryCreated(t('forms.categoryUpdated'))
    } catch (err: any) {
      console.error("Error al actualizar categoría:", err)
    }
  }

  const handleDelete = async (category: FormCategory) => {
    if (!category._id) return

    setDeletingCategory(category)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory?._id) return

    try {
      await removeCategory(deletingCategory._id)
      await loadCategories()
      onCategoryCreated(t('forms.categoryDeleted'))
      setShowDeleteConfirm(false)
      setDeletingCategory(null)
    } catch (err: any) {
      console.error("Error al eliminar categoría:", err)
      // Aquí podrías mostrar un modal de error si quieres
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
    onRequestClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal} style={{ maxWidth: "800px", width: "90%" }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('forms.manageFormCategories')}</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text)" }}>
              <div className={styles.spinner}></div>
              <p>{t('forms.loadingCategories')}</p>
            </div>
          ) : error ? (
            <div style={{ color: "#dc3545", textAlign: "center", padding: "1rem" }}>
              {t('common.error')}: {error}
            </div>
          ) : (
            <div>
              {categories.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                  {t('forms.noCategoriesCreated')}
                </p>
              ) : (
                <div className={styles.listContainer}>
                  {categories.map((category) => (
                    <div key={category._id} className={styles.listItem}>
                      {editingCategory?._id === category._id ? (
                        <div className={styles.editFormContent}>
                          <div className={styles.editFormGroup}>
                            <label>{t('forms.name')}</label>
                            <input
                              type="text"
                              value={editFormData.nombre || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                            />
                          </div>
                          <div className={styles.editFormGroup}>
                            <label>{t('forms.description')}</label>
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
                              <span>{t('forms.active')}</span>
                            </div>
                          </div>
                          <div className={formButtonStyles.actions}>
                            <button
                              onClick={handleSaveEdit}
                              style={{
                                background: 'var(--color-nav)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.875rem 1.75rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                minWidth: '120px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(3, 79, 73, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-nav-hover)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(3, 79, 73, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--color-nav)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(3, 79, 73, 0.3)';
                              }}
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
                        <div className={styles.itemInfo}>
                          <div className={styles.itemTitle}>{category.nombre}</div>
                          {category.descripcion && (
                            <div className={styles.itemDescription}>{category.descripcion}</div>
                          )}
                          <div className={`${styles.itemStatus} ${category.activa ? styles.active : styles.inactive}`}>
                            {category.activa ? t('forms.active') : t('forms.inactive')}
                          </div>
                        </div>
                      )}
                      {editingCategory?._id !== category._id && (
                        <div className={styles.itemActions}>
                          <button
                            onClick={() => handleEdit(category)}
                            className={`${styles.actionButton} ${styles.edit}`}
                            aria-label={t('common.edit')}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
                            className={`${styles.actionButton} ${styles.delete}`}
                            aria-label={t('common.delete')}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && deletingCategory && (
        <div className={styles.backdrop}>
          <div className={styles.deleteConfirmModal}>
            <div className={styles.deleteConfirmHeader}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div className={styles.deleteConfirmContent}>
              <h3 className={styles.deleteConfirmTitle}>
                {t('forms.confirmDeleteCategory', { name: deletingCategory.nombre })}
              </h3>
              <p className={styles.deleteConfirmDescription}>
                {t('forms.deleteCategoryWarning')}
              </p>
              <div className={formButtonStyles.actions}>
                <button
                  onClick={confirmDelete}
                  className={formButtonStyles.submitButton}
                >
                  {t('common.delete')}
                </button>
                <button
                  onClick={cancelDelete}
                  className={formButtonStyles.cancelButton}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModalManageCategories 
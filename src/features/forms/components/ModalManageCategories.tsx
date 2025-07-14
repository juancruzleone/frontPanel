import { useEffect, useState } from "react"
import { Edit, Trash, Plus } from "lucide-react"
import styles from "../styles/Modal.module.css"
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

    if (window.confirm(t('forms.confirmDeleteCategory', { name: category.nombre }))) {
      try {
        await removeCategory(category._id)
        await loadCategories()
        onCategoryCreated(t('forms.categoryDeleted'))
      } catch (err: any) {
        console.error("Error al eliminar categoría:", err)
        alert(t('forms.errorDeletingCategory') + ": " + err.message)
      }
    }
  }

  const handleClose = () => {
    handleCancelEdit()
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
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {categories.map((category) => (
                    <div
                      key={category._id}
                      style={{
                        border: "1px solid var(--color-card-border)",
                        borderRadius: "8px",
                        padding: "1rem",
                        marginBottom: "1rem",
                        backgroundColor: "var(--color-card)",
                      }}
                    >
                      {editingCategory?._id === category._id ? (
                        <div>
                          <div style={{ marginBottom: "1rem" }}>
                            <label style={{ 
                              display: "block", 
                              marginBottom: "0.5rem", 
                              fontWeight: "bold",
                              color: "var(--color-text)"
                            }}>
                              {t('forms.name')}:
                            </label>
                            <input
                              type="text"
                              value={editFormData.nombre || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid var(--color-card-border)",
                                borderRadius: "4px",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: "1rem" }}>
                            <label style={{ 
                              display: "block", 
                              marginBottom: "0.5rem", 
                              fontWeight: "bold",
                              color: "var(--color-text)"
                            }}>
                              {t('forms.description')}:
                            </label>
                            <textarea
                              value={editFormData.descripcion || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid var(--color-card-border)",
                                borderRadius: "4px",
                                minHeight: "80px",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                                resize: "vertical",
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: "1rem" }}>
                            <label style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "0.5rem",
                              color: "var(--color-text)"
                            }}>
                              <input
                                type="checkbox"
                                checked={editFormData.activa ?? true}
                                onChange={(e) => setEditFormData({ ...editFormData, activa: e.target.checked })}
                                style={{
                                  accentColor: "var(--color-primary)",
                                }}
                              />
                              <span>{t('forms.active')}</span>
                            </label>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={handleSaveEdit}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "var(--color-primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            >
                              {t('common.save')}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "transparent",
                                color: "var(--color-text)",
                                border: "1px solid var(--color-card-border)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                              }}
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <h3 style={{ margin: 0, color: "var(--color-text)", fontSize: "1.1rem" }}>
                              {category.nombre}
                            </h3>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleEdit(category)}
                                style={{
                                  padding: "0.25rem",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--color-text)",
                                }}
                                aria-label={t('common.edit')}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(category)}
                                style={{
                                  padding: "0.25rem",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#dc3545",
                                }}
                                aria-label={t('common.delete')}
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                          {category.descripcion && (
                            <p style={{ 
                              margin: "0.5rem 0", 
                              color: "var(--color-text-secondary)",
                              fontSize: "0.9rem"
                            }}>
                              {category.descripcion}
                            </p>
                          )}
                          <div style={{ 
                            display: "inline-block", 
                            padding: "0.25rem 0.5rem", 
                            borderRadius: "4px", 
                            fontSize: "0.8rem",
                            backgroundColor: category.activa ? "#d4edda" : "#f8d7da",
                            color: category.activa ? "#155724" : "#721c24"
                          }}>
                            {category.activa ? t('forms.active') : t('forms.inactive')}
                          </div>
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
    </div>
  )
}

export default ModalManageCategories 
import { useEffect, useState } from "react"
import { Edit, Trash, Plus } from "lucide-react"
import styles from "../styles/Modal.module.css"
import useFormCategories from "../hooks/useFormCategories"
import type { FormCategory } from "../hooks/useFormCategories"

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
      onCategoryCreated("Categoría actualizada con éxito")
    } catch (err: any) {
      console.error("Error al actualizar categoría:", err)
    }
  }

  const handleDelete = async (category: FormCategory) => {
    if (!category._id) return

    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.nombre}"?`)) {
      try {
        await removeCategory(category._id)
        await loadCategories()
        onCategoryCreated("Categoría eliminada con éxito")
      } catch (err: any) {
        console.error("Error al eliminar categoría:", err)
        alert("Error al eliminar categoría: " + err.message)
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
          <h2 className={styles.title}>Gestionar Categorías de Formularios</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text)" }}>
              <div className={styles.spinner}></div>
              <p>Cargando categorías...</p>
            </div>
          ) : error ? (
            <div style={{ color: "#dc3545", textAlign: "center", padding: "1rem" }}>
              Error: {error}
            </div>
          ) : (
            <div>
              {categories.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)" }}>
                  No hay categorías creadas
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
                              Nombre:
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
                              Descripción:
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
                              <span>Activa</span>
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
                                fontWeight: "500",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--color-primary-hover)"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--color-primary)"
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                padding: "0.5rem 1rem",
                                backgroundColor: "var(--color-secondary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "500",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--color-secondary-hover)"
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--color-secondary)"
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ 
                                margin: "0 0 0.5rem 0", 
                                color: "var(--color-text)",
                                fontSize: "1.1rem",
                                fontWeight: "600"
                              }}>
                                {category.nombre}
                                {!category.activa && (
                                  <span
                                    style={{
                                      marginLeft: "0.5rem",
                                      padding: "0.25rem 0.5rem",
                                      backgroundColor: "#ffc107",
                                      color: "#856404",
                                      borderRadius: "4px",
                                      fontSize: "0.75rem",
                                      fontWeight: "500",
                                    }}
                                  >
                                    Inactiva
                                  </span>
                                )}
                              </h3>
                              {category.descripcion && (
                                <p style={{ 
                                  margin: "0 0 1rem 0", 
                                  color: "var(--color-text-secondary)", 
                                  fontSize: "0.9rem",
                                  lineHeight: "1.4"
                                }}>
                                  {category.descripcion}
                                </p>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                onClick={() => handleEdit(category)}
                                style={{
                                  padding: "0.5rem",
                                  backgroundColor: "#28a745",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                title="Editar categoría"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#218838"
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#28a745"
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(category)}
                                style={{
                                  padding: "0.5rem",
                                  backgroundColor: "#dc3545",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                title="Eliminar categoría"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#c82333"
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "#dc3545"
                                }}
                              >
                                <Trash size={16} />
                              </button>
                            </div>
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
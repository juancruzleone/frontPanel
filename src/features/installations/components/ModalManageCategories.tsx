import React, { useState } from "react"
import styles from "../styles/Modal.module.css"

interface Category {
  _id?: string
  nombre: string
  descripcion?: string
}

interface ModalManageCategoriesProps {
  isOpen: boolean
  onRequestClose: () => void
  categories: Category[]
  onEditCategory: (id: string, data: Partial<Category>) => Promise<{ message: string }>
  onDeleteCategory: (id: string) => Promise<{ message: string }>
  onSubmitSuccess: (message: string) => void
}

const ModalManageCategories = ({
  isOpen,
  onRequestClose,
  categories,
  onEditCategory,
  onDeleteCategory,
  onSubmitSuccess,
}: ModalManageCategoriesProps) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editData, setEditData] = useState({ nombre: "", descripcion: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null)

  if (!isOpen) return null

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setEditData({
      nombre: category.nombre,
      descripcion: category.descripcion || "",
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditData({ nombre: "", descripcion: "" })
  }

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory._id) return

    setIsSubmitting(true)
    try {
      await onEditCategory(editingCategory._id, editData)
      onSubmitSuccess("Categoría actualizada con éxito")
      setEditingCategory(null)
      setEditData({ nombre: "", descripcion: "" })
    } catch (error: any) {
      onSubmitSuccess("Error al actualizar categoría")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    setDeletingCategory(categoryId)
    try {
      await onDeleteCategory(categoryId)
      onSubmitSuccess("Categoría eliminada con éxito")
    } catch (error: any) {
      onSubmitSuccess("Error al eliminar categoría")
    } finally {
      setDeletingCategory(null)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Gestionar Categorías</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.categoriesList}>
            {categories.length === 0 ? (
              <p className={styles.emptyMessage}>No hay categorías creadas</p>
            ) : (
              categories.map((category) => (
                <div key={category._id} className={styles.categoryItem}>
                  {editingCategory?._id === category._id ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        value={editData.nombre}
                        onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                        placeholder="Nombre de la categoría"
                        className={styles.editInput}
                      />
                      <input
                        type="text"
                        value={editData.descripcion}
                        onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                        placeholder="Descripción (opcional)"
                        className={styles.editInput}
                      />
                      <div className={styles.editActions}>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSubmitting}
                          className={styles.saveButton}
                        >
                          {isSubmitting ? "Guardando..." : "Guardar"}
                        </button>
                        <button onClick={handleCancelEdit} className={styles.cancelButton}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.categoryInfo}>
                        <h4 className={styles.categoryName}>{category.nombre}</h4>
                        {category.descripcion && (
                          <p className={styles.categoryDescription}>{category.descripcion}</p>
                        )}
                      </div>
                      <div className={styles.categoryActions}>
                        <button
                          onClick={() => handleEdit(category)}
                          className={styles.editButton}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          disabled={deletingCategory === category._id}
                          className={styles.deleteButton}
                        >
                          {deletingCategory === category._id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalManageCategories 
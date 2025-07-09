import React, { useState } from "react"
import styles from "../styles/Modal.module.css"

interface InstallationType {
  _id: string
  nombre: string
  descripcion?: string
}

interface ModalManageInstallationTypesProps {
  isOpen: boolean
  onRequestClose: () => void
  installationTypes: InstallationType[]
  onEditInstallationType: (id: string, data: Partial<InstallationType>) => Promise<{ message: string }>
  onDeleteInstallationType: (id: string) => Promise<{ message: string }>
  onSubmitSuccess: (message: string) => void
}

const ModalManageInstallationTypes = ({
  isOpen,
  onRequestClose,
  installationTypes,
  onEditInstallationType,
  onDeleteInstallationType,
  onSubmitSuccess,
}: ModalManageInstallationTypesProps) => {
  const [editingType, setEditingType] = useState<InstallationType | null>(null)
  const [editData, setEditData] = useState({ nombre: "", descripcion: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingType, setDeletingType] = useState<string | null>(null)

  if (!isOpen) return null

  const handleEdit = (type: InstallationType) => {
    setEditingType(type)
    setEditData({
      nombre: type.nombre,
      descripcion: type.descripcion || "",
    })
  }

  const handleCancelEdit = () => {
    setEditingType(null)
    setEditData({ nombre: "", descripcion: "" })
  }

  const handleSaveEdit = async () => {
    if (!editingType) return

    setIsSubmitting(true)
    try {
      await onEditInstallationType(editingType._id, editData)
      onSubmitSuccess("Tipo de instalación actualizado con éxito")
      setEditingType(null)
      setEditData({ nombre: "", descripcion: "" })
    } catch (error: any) {
      onSubmitSuccess("Error al actualizar tipo de instalación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (typeId: string) => {
    setDeletingType(typeId)
    try {
      await onDeleteInstallationType(typeId)
      onSubmitSuccess("Tipo de instalación eliminado con éxito")
    } catch (error: any) {
      onSubmitSuccess("Error al eliminar tipo de instalación")
    } finally {
      setDeletingType(null)
    }
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Gestionar Tipos de Instalación</h2>
          <button className={styles.closeButton} onClick={onRequestClose}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.categoriesList}>
            {installationTypes.length === 0 ? (
              <p className={styles.emptyMessage}>No hay tipos de instalación creados</p>
            ) : (
              installationTypes.map((type) => (
                <div key={type._id} className={styles.categoryItem}>
                  {editingType?._id === type._id ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        value={editData.nombre}
                        onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                        placeholder="Nombre del tipo"
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
                        <h4 className={styles.categoryName}>{type.nombre}</h4>
                        {type.descripcion && (
                          <p className={styles.categoryDescription}>{type.descripcion}</p>
                        )}
                      </div>
                      <div className={styles.categoryActions}>
                        <button
                          onClick={() => handleEdit(type)}
                          className={styles.editButton}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(type._id)}
                          disabled={deletingType === type._id}
                          className={styles.deleteButton}
                        >
                          {deletingType === type._id ? "Eliminando..." : "Eliminar"}
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

export default ModalManageInstallationTypes 
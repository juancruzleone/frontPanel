"use client"

import { useEffect, useState, useRef } from "react"
import WorkOrderForm from "./WorkOrderForm"
import styles from "../styles/Modal.module.css"
import useWorkOrders, { type WorkOrder } from "../hooks/useWorkOrders"

interface ModalEditProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onEdit: (id: string, data: WorkOrder) => Promise<{ message: string }>
  initialData: WorkOrder | null
  installations: any[]
  loadingInstallations: boolean
  errorLoadingInstallations: string | null
}

const ModalEdit = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onEdit,
  initialData,
  installations,
  loadingInstallations,
  errorLoadingInstallations,
}: ModalEditProps) => {
  const {
    formData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
    setFormValues,
  } = useWorkOrders()

  const [isInitialized, setIsInitialized] = useState(false)
  const initialDataRef = useRef<WorkOrder | null>(null)

  const handleClose = () => {
    resetForm()
    setIsInitialized(false)
    initialDataRef.current = null
    onRequestClose()
  }

  // Solo inicializar cuando el modal se abre por primera vez o cuando cambia initialData
  useEffect(() => {
    if (isOpen && initialData && installations.length > 0) {
      // Solo inicializar si es diferente initialData o si no se ha inicializado
      if (!isInitialized || initialDataRef.current?._id !== initialData._id) {
        console.log("Inicializando formulario con:", initialData)
        setFormValues(initialData, installations)
        setIsInitialized(true)
        initialDataRef.current = initialData
      }
    } else if (isOpen && !initialData && !isInitialized) {
      resetForm()
      setIsInitialized(true)
      initialDataRef.current = null
    } else if (!isOpen) {
      setIsInitialized(false)
      initialDataRef.current = null
    }
  }, [isOpen, initialData, installations]) // Solo depender de isOpen, el ID de initialData y la longitud de installations

  if (!isOpen) return null

  // Mostrar modal de no editable si la orden está completada o en progreso
  if (initialData && ["completada", "en_progreso"].includes(initialData.estado)) {
    return (
      <div className={styles.backdrop}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2 className={styles.title}>Orden no editable</h2>
            <button className={styles.closeButton} onClick={onRequestClose}>
              ×
            </button>
          </div>
          <div className={styles.modalContent}>
            <p>No se puede editar una orden {initialData.estado.replace("_", " ")}</p>
            <button className={styles.cancelButton} onClick={onRequestClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Editar Orden de Trabajo</h2>
          <button className={styles.closeButton} onClick={handleClose} disabled={isSubmitting}>
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <WorkOrderForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onEdit={onEdit}
            isEditMode={true}
            initialData={initialData}
            formData={formData}
            formErrors={formErrors}
            handleFieldChange={handleFieldChange}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
            installations={installations}
            loadingInstallations={loadingInstallations}
            errorLoadingInstallations={errorLoadingInstallations}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalEdit

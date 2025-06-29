"use client"

import type React from "react"
import { useEffect, useState } from "react"
import styles from "../styles/Modal.module.css"
import type { WorkOrder } from "../hooks/useWorkOrders"

interface ModalCompleteWorkOrderProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onComplete: (workOrderId: string, completionData: any) => Promise<{ message: string }>
  workOrder: WorkOrder | null
}

const ModalCompleteWorkOrder = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onComplete,
  workOrder,
}: ModalCompleteWorkOrderProps) => {
  const [completionData, setCompletionData] = useState({
    trabajoRealizado: "",
    observaciones: "",
    tiempoTrabajo: 1,
    materialesUtilizados: [],
    estadoDispositivo: "",
  })
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleClose = () => {
    setCompletionData({
      trabajoRealizado: "",
      observaciones: "",
      tiempoTrabajo: 1,
      materialesUtilizados: [],
      estadoDispositivo: "",
    })
    setTouchedFields({})
    setError("")
    onRequestClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCompletionData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleFieldBlur = (fieldName: string) => {
    if (!touchedFields[fieldName]) {
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))
    }
  }

  const showError = (fieldName: string) =>
    touchedFields[fieldName] && !completionData[fieldName as keyof typeof completionData]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workOrder?._id) return

    console.log("🚀 Iniciando completar orden desde modal:", workOrder._id, completionData)

    // Mark all fields as touched
    const allFields = Object.keys(completionData)
    const newTouchedFields = allFields.reduce(
      (acc, field) => {
        acc[field] = true
        return acc
      },
      {} as Record<string, boolean>,
    )
    setTouchedFields(newTouchedFields)

    if (!completionData.trabajoRealizado || !completionData.observaciones) {
      setError("Los campos de trabajo realizado y observaciones son obligatorios")
      return
    }

    setIsSubmitting(true)
    try {
      console.log("📤 Enviando datos de completación:", completionData)
      const result = await onComplete(workOrder._id, completionData)
      console.log("✅ Orden completada exitosamente:", result)
      onSubmitSuccess(result.message)
      handleClose()
    } catch (err: any) {
      console.error("❌ Error al completar orden:", err)
      setError(err.message || "Error al completar orden de trabajo")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen && workOrder) {
      setCompletionData({
        trabajoRealizado: "",
        observaciones: "",
        tiempoTrabajo: 1,
        materialesUtilizados: [],
        estadoDispositivo: workOrder.dispositivo?.estado || "Activo",
      })
      setTouchedFields({})
      setError("")
    }
  }, [isOpen, workOrder])

  if (!isOpen || !workOrder) return null

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>Completar Orden de Trabajo</h2>
            <p className={styles.installationInfo}>
              {workOrder.titulo} - {workOrder.dispositivo?.nombre}
            </p>
          </div>
          <button className={styles.closeButton} onClick={handleClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formInner}>
              <div className={styles.formGroup}>
                <label>Orden de Trabajo</label>
                <div className={styles.infoDisplay}>
                  <strong>{workOrder.titulo}</strong>
                  {workOrder.descripcion && <p>{workOrder.descripcion}</p>}
                </div>
              </div>

              {workOrder.dispositivo && (
                <div className={styles.formGroup}>
                  <label>Dispositivo</label>
                  <div className={styles.infoDisplay}>
                    <strong>{workOrder.dispositivo.nombre}</strong>
                    <p>Ubicación: {workOrder.dispositivo.ubicacion}</p>
                    <p>Estado actual: {workOrder.dispositivo.estado}</p>
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Trabajo Realizado*</label>
                <textarea
                  name="trabajoRealizado"
                  value={completionData.trabajoRealizado}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("trabajoRealizado")}
                  disabled={isSubmitting}
                  rows={4}
                  placeholder="Describe detalladamente el trabajo realizado..."
                  className={showError("trabajoRealizado") ? styles.errorInput : ""}
                />
                {showError("trabajoRealizado") && (
                  <p className={styles.inputError}>El trabajo realizado es obligatorio</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Observaciones*</label>
                <textarea
                  name="observaciones"
                  value={completionData.observaciones}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("observaciones")}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Agrega observaciones importantes..."
                  className={showError("observaciones") ? styles.errorInput : ""}
                />
                {showError("observaciones") && <p className={styles.inputError}>Las observaciones son obligatorias</p>}
              </div>

              {/* Fila corregida para alineación */}
              <div className={styles.formRowFixed}>
                <div className={styles.formGroup}>
                  <label>Tiempo de Trabajo (horas)</label>
                  <input
                    type="number"
                    name="tiempoTrabajo"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={completionData.tiempoTrabajo}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("tiempoTrabajo")}
                    disabled={isSubmitting}
                  />
                </div>

                {workOrder.dispositivo && (
                  <div className={styles.formGroup}>
                    <label>Estado del Dispositivo</label>
                    <select
                      name="estadoDispositivo"
                      value={completionData.estadoDispositivo}
                      onChange={handleChange}
                      onBlur={() => handleFieldBlur("estadoDispositivo")}
                      disabled={isSubmitting}
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="En mantenimiento">En mantenimiento</option>
                      <option value="Fuera de servicio">Fuera de servicio</option>
                      <option value="Pendiente de revisión">Pendiente de revisión</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <p className={styles.generalError}>{error}</p>}
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={handleClose} disabled={isSubmitting} className={styles.cancelButton}>
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                {isSubmitting ? "Completando..." : "Completar Orden"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ModalCompleteWorkOrder

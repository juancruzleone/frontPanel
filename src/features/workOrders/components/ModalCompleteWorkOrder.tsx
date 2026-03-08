import type React from "react"
import { useEffect, useRef, useState } from "react"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [completionData, setCompletionData] = useState({
    trabajoRealizado: "",
    observaciones: "",
    tiempoTrabajo: 1,
    materialesUtilizados: [],
    estadoDispositivo: "",
    evidenciaFoto: "",
    nombreFoto: "",
    firmaTecnico: "",
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
      evidenciaFoto: "",
      nombreFoto: "",
      firmaTecnico: "",
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

  const updateSignatureValue = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL("image/png")
    setCompletionData((prev) => ({ ...prev, firmaTecnico: dataUrl }))
  }

  const getCanvasPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY)
    isDrawingRef.current = true
    lastPointRef.current = point
  }

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return

    const point = getCanvasPoint(clientX, clientY)
    context.lineWidth = 2
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#0f172a"
    context.beginPath()
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
  }

  const stopDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    updateSignatureValue()
  }

  const clearSignature = () => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setCompletionData((prev) => ({ ...prev, firmaTecnico: "" }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      setCompletionData((prev) => ({
        ...prev,
        evidenciaFoto: result,
        nombreFoto: file.name,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workOrder?._id) return

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

    if (!completionData.firmaTecnico) {
      setError("La firma del técnico es obligatoria")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onComplete(workOrder._id, completionData)
      onSubmitSuccess(result.message)
      handleClose()
    } catch (err: any) {
      setError(err.message || "Error al completar orden de trabajo")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [isOpen])

  useEffect(() => {
    const currentDeviceState =
      (workOrder?.dispositivo as WorkOrder["dispositivo"] & { estado?: string } | undefined)?.estado || "Activo"
    if (isOpen && workOrder) {
      setCompletionData({
        trabajoRealizado: "",
        observaciones: "",
        tiempoTrabajo: 1,
        materialesUtilizados: [],
        estadoDispositivo: currentDeviceState,
        evidenciaFoto: "",
        nombreFoto: "",
        firmaTecnico: "",
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
                    <p>Estado actual: {(workOrder.dispositivo as WorkOrder["dispositivo"] & { estado?: string }).estado || "Activo"}</p>
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

              <div className={styles.formGroup}>
                <label>Foto de evidencia</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  disabled={isSubmitting}
                />
                {completionData.evidenciaFoto && (
                  <div className={styles.previewBlock}>
                    <img src={completionData.evidenciaFoto} alt={completionData.nombreFoto || "Evidencia"} className={styles.previewImage} />
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Firma digital del técnico*</label>
                <div className={`${styles.signatureBox} ${showError("firmaTecnico") ? styles.errorInput : ""}`}>
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={220}
                    className={styles.signatureCanvas}
                    onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                    onMouseMove={(e) => draw(e.clientX, e.clientY)}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      const touch = e.touches[0]
                      startDrawing(touch.clientX, touch.clientY)
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault()
                      const touch = e.touches[0]
                      draw(touch.clientX, touch.clientY)
                    }}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <button type="button" onClick={clearSignature} disabled={isSubmitting} className={styles.clearSignatureButton}>
                  Limpiar firma
                </button>
                {showError("firmaTecnico") && <p className={styles.inputError}>La firma es obligatoria</p>}
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

            <div className={formButtonStyles.actions}>
              <button type="button" onClick={handleClose} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className={formButtonStyles.submitButton}>
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

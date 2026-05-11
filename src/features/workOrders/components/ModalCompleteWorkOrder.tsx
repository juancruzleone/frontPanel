import type React from "react"
import { useEffect, useRef, useState, useMemo } from "react"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import type { WorkOrder } from "../hooks/useWorkOrders"
import { useTranslation } from "react-i18next"
import useInventory from "../../inventory/hooks/useInventory"
import { Plus, Trash2 } from "lucide-react"

interface InventoryPartUsed {
  inventoryItemId: string
  nameSnapshot: string
  unit: string
  quantity: number
}

interface ModalCompleteWorkOrderProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onComplete: (workOrderId: string, completionData: Record<string, unknown>) => Promise<{ message: string }>
  workOrder: WorkOrder | null
}

const ModalCompleteWorkOrder = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  onComplete,
  workOrder,
}: ModalCompleteWorkOrderProps) => {
  const { t } = useTranslation()
  const { items: inventoryItems, loadInventory } = useInventory()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [completionData, setCompletionData] = useState<{
    trabajoRealizado: string
    observaciones: string
    tiempoTrabajo: number
    materialesUtilizados: { nombre: string; cantidad: number; unidad: string }[]
    inventoryPartsUsed: InventoryPartUsed[]
    estadoDispositivo: string
    evidenciaFoto: string
    nombreFoto: string
    firmaTecnico: string
  }>({
    trabajoRealizado: "",
    observaciones: "",
    tiempoTrabajo: 1,
    materialesUtilizados: [],
    inventoryPartsUsed: [],
    estadoDispositivo: "",
    evidenciaFoto: "",
    nombreFoto: "",
    firmaTecnico: "",
  })

  useEffect(() => {
    if (isOpen) {
      loadInventory({ limit: 100 })
    }
  }, [isOpen, loadInventory])

  const [selectedInventoryItem, setSelectedInventoryItem] = useState("")
  const [itemQuantity, setItemQuantity] = useState(1)
  const [inventoryError, setInventoryError] = useState("")

  const selectedInventoryStock = useMemo(() => {
    const selectedItem = inventoryItems.find((item) => item._id === selectedInventoryItem)
    return selectedItem?.currentStock ?? 0
  }, [inventoryItems, selectedInventoryItem])

  const getAlreadySelectedQuantity = (inventoryItemId: string): number => {
    return completionData.inventoryPartsUsed
      .filter((part) => part.inventoryItemId === inventoryItemId)
      .reduce((acc, part) => acc + Number(part.quantity), 0)
  }

  const addPart = () => {
    if (!selectedInventoryItem) return
    const item = inventoryItems.find(i => i._id === selectedInventoryItem)
    if (!item || !item._id) return

    const normalizedQuantity = Number(itemQuantity)
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      setInventoryError(t('inventory.invalidQuantity', { defaultValue: 'La cantidad debe ser mayor a cero' }))
      return
    }

    const alreadySelectedQuantity = getAlreadySelectedQuantity(item._id)
    const totalRequested = alreadySelectedQuantity + normalizedQuantity
    if (totalRequested > item.currentStock) {
      setInventoryError(
        t('inventory.insufficientStockDetailed', {
          defaultValue: 'Stock insuficiente para {{item}}. Disponible: {{available}}, solicitado: {{requested}}',
          item: item.name,
          available: item.currentStock,
          requested: totalRequested,
        }),
      )
      return
    }

    const newPart: InventoryPartUsed = {
      inventoryItemId: item._id,
      nameSnapshot: item.name,
      unit: item.unit,
      quantity: normalizedQuantity
    }

    setCompletionData(prev => ({
      ...prev,
      inventoryPartsUsed: prev.inventoryPartsUsed.some((part) => part.inventoryItemId === newPart.inventoryItemId)
        ? prev.inventoryPartsUsed.map((part) =>
            part.inventoryItemId === newPart.inventoryItemId
              ? { ...part, quantity: part.quantity + newPart.quantity }
              : part,
          )
        : [...prev.inventoryPartsUsed, newPart]
    }))
    setInventoryError("")
    setSelectedInventoryItem("")
    setItemQuantity(1)
  }

  const removePart = (index: number) => {
    setCompletionData(prev => ({
      ...prev,
      inventoryPartsUsed: prev.inventoryPartsUsed.filter((_, i) => i !== index)
    }))
    setInventoryError("")
  }
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleClose = () => {
    setCompletionData({
      trabajoRealizado: "",
      observaciones: "",
      tiempoTrabajo: 1,
      materialesUtilizados: [],
      inventoryPartsUsed: [],
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

    for (const part of completionData.inventoryPartsUsed) {
      const item = inventoryItems.find((inventoryItem) => inventoryItem._id === part.inventoryItemId)
      if (!item) {
        setError(t('inventory.itemNotFound', { defaultValue: 'El item de inventario ya no está disponible' }))
        return
      }

      if (part.quantity > item.currentStock) {
        setError(
          t('inventory.insufficientStockDetailed', {
            defaultValue: 'Stock insuficiente para {{item}}. Disponible: {{available}}, solicitado: {{requested}}',
            item: part.nameSnapshot,
            available: item.currentStock,
            requested: part.quantity,
          }),
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      const updatedCompletionData = {
        ...completionData,
        materialesUtilizados: completionData.inventoryPartsUsed.map(
          part => ({
            nombre: part.nameSnapshot,
            cantidad: part.quantity,
            unidad: part.unit
          })
        )
      }
      
      const result = await onComplete(workOrder._id, updatedCompletionData as unknown as Record<string, unknown>)
      onSubmitSuccess(result.message)
      handleClose()
    } catch (err: unknown) {
      setError((err as Error).message || "Error al completar orden de trabajo")
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
        inventoryPartsUsed: [],
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

              {/* SECCIÓN DE INVENTARIO */}
              <div className={styles.formGroup}>
                <label>{t('inventory.inventoryMaterials')}</label>
                <div className="flex gap-2 mb-2">
                  <select 
                    value={selectedInventoryItem}
                    onChange={(e) => setSelectedInventoryItem(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    disabled={isSubmitting}
                  >
                    <option value="">{t('inventory.selectItem')}</option>
                    {inventoryItems.map(item => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.currentStock} {item.unit})
                      </option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => {
                      setItemQuantity(Number(e.target.value))
                      if (inventoryError) {
                        setInventoryError("")
                      }
                    }}
                    min={1}
                    className="w-20 p-2 border border-gray-300 rounded"
                    disabled={isSubmitting}
                  />
                  <button 
                    type="button"
                    onClick={addPart}
                    disabled={!selectedInventoryItem || isSubmitting}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    aria-label="Add Part"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {selectedInventoryItem && (
                  <p className={styles.helperText}>
                    {t('inventory.availableStock', { defaultValue: 'Stock disponible' })}: {selectedInventoryStock}
                  </p>
                )}

                {inventoryError && <p className={styles.inputError}>{inventoryError}</p>}

                {completionData.inventoryPartsUsed.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {completionData.inventoryPartsUsed.map((part, index) => (
                      <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span>{part.nameSnapshot} x {part.quantity} {part.unit}</span>
                        <button 
                          type="button"
                          onClick={() => removePart(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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

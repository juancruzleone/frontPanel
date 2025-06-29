"use client"

import type React from "react"
import { useState, useCallback } from "react"
import {
  fetchWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  assignTechnicianToWorkOrder,
  completeWorkOrder as apiCompleteWorkOrder,
  startWorkOrder as apiStartWorkOrder,
  fetchInstallations as apiFetchInstallations,
} from "../services/workOrderServices"
import { fetchTechnicians } from "../services/technicianServices"
import { validateWorkOrderForm } from "../validators/workOrderValidations"

export type Technician = {
  _id: string
  userName: string
  email?: string
  role: string
}

export type Installation = {
  _id: string
  company: string
  address: string
  city: string
  devices?: Device[]
}

export type Device = {
  _id: string
  nombre: string
  ubicacion: string
  categoria: string
  templateId?: string
}

export type WorkOrder = {
  _id?: string
  titulo: string
  descripcion: string
  instalacionId: string
  instalacion?: Installation
  dispositivoId?: string
  dispositivo?: Device
  estado: string
  prioridad: string
  tipoTrabajo: string
  fechaProgramada: Date | string
  horaProgramada: string
  tecnicoAsignado?: string
  tecnico?: Technician | Technician[] | string
  creadoPor?: string
  fechaCreacion?: Date | string
  fechaAsignacion?: Date | string
  fechaInicio?: Date | string
  fechaCompletada?: Date | string
  observaciones?: string
  trabajoRealizado?: string
  materialesUtilizados?: {
    nombre: string
    cantidad: number
    unidad: string
  }[]
  tiempoTrabajo?: number
  estadoDispositivo?: string
  formularioRespuestas?: Record<string, any>
  pdfUrl?: string
  historial?: {
    accion: string
    fecha: Date | string
    usuario: string
    observaciones: string
  }[]
}

const useWorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingInstallations, setLoadingInstallations] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorLoadingInstallations, setErrorLoadingInstallations] = useState<string | null>(null)

  const [formData, setFormData] = useState<Omit<WorkOrder, "_id">>({
    titulo: "",
    descripcion: "",
    instalacionId: "",
    estado: "pendiente",
    prioridad: "media",
    tipoTrabajo: "mantenimiento",
    fechaProgramada: new Date(),
    horaProgramada: "09:00",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadTechnicians = useCallback(async () => {
    try {
      const data = await fetchTechnicians()
      setTechnicians(data)
      return data
    } catch (err: any) {
      console.error("Error al cargar técnicos:", err)
      setTechnicians([])
      return []
    }
  }, [])

  const loadWorkOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const workOrdersData = await fetchWorkOrders()
      console.log(
        "Órdenes cargadas:",
        workOrdersData.map((order) => ({
          id: order._id,
          titulo: order.titulo,
          estado: order.estado,
          tecnico: order.tecnico ? order.tecnico.userName : null,
          tecnicoAsignado: order.tecnicoAsignado,
          instalacion: order.instalacion ? order.instalacion.company : null,
        })),
      )
      setWorkOrders(workOrdersData)
    } catch (err: any) {
      console.error("Error al cargar órdenes de trabajo:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInstallations = useCallback(async () => {
    setLoadingInstallations(true)
    setErrorLoadingInstallations(null)
    try {
      const data = await apiFetchInstallations()
      setInstallations(data)
    } catch (err: any) {
      console.error("Error al cargar instalaciones:", err)
      setErrorLoadingInstallations(err.message || "Error al cargar instalaciones")
      setInstallations([])
    } finally {
      setLoadingInstallations(false)
    }
  }, [])

  const addWorkOrder = async (workOrder: WorkOrder) => {
    const newOrder = await createWorkOrder(workOrder)
    setWorkOrders((prev) => [newOrder, ...prev])
    return { message: "Orden de trabajo creada con éxito" }
  }

  const editWorkOrder = async (id: string, updatedData: WorkOrder) => {
    const updated = await updateWorkOrder(id, updatedData)
    setWorkOrders((prev) => prev.map((o) => (o._id === id ? updated : o)))
    return { message: "Orden de trabajo actualizada con éxito" }
  }

  const removeWorkOrder = async (id: string) => {
    await deleteWorkOrder(id)
    setWorkOrders((prev) => prev.filter((o) => o._id !== id))
  }

  const assignTechnician = async (workOrderId: string, technicianId: string) => {
    await assignTechnicianToWorkOrder(workOrderId, technicianId)
    // Recargar para obtener la información actualizada del técnico
    await loadWorkOrders()
    return { message: "Técnico asignado con éxito" }
  }

  const completeWorkOrder = async (id: string, data: any) => {
    console.log("🚀 Hook: Iniciando completar orden:", id, data)

    try {
      // 1. Hacer POST para completar la orden
      const result = await apiCompleteWorkOrder(id, data)
      console.log("✅ Hook: POST completado exitosamente:", result)

      // 2. Actualizar estado local (sin hacer GET adicional)
      setWorkOrders((prev) =>
        prev.map((o) =>
          o._id === id
            ? {
                ...o,
                estado: "completada",
                fechaCompletada: new Date(),
                trabajoRealizado: data.trabajoRealizado,
                observaciones: data.observaciones,
                tiempoTrabajo: data.tiempoTrabajo,
                estadoDispositivo: data.estadoDispositivo,
                ...result,
              }
            : o,
        ),
      )

      console.log("✅ Hook: Estado local actualizado")
      return { message: "Orden de trabajo completada con éxito" }
    } catch (error) {
      console.error("❌ Hook: Error al completar orden:", error)
      throw error
    }
  }

  const startWorkOrder = async (id: string) => {
    console.log("🚀 Hook: Iniciando orden:", id)

    try {
      await apiStartWorkOrder(id)
      console.log("✅ Hook: Orden iniciada exitosamente")

      // Actualizar estado local
      setWorkOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, estado: "en_progreso", fechaInicio: new Date() } : o)),
      )

      return { message: "Orden de trabajo iniciada con éxito" }
    } catch (error) {
      console.error("❌ Hook: Error al iniciar orden:", error)
      throw error
    }
  }

  const handleFieldChange = async (name: string, value: string) => {
    const updated = { ...formData, [name]: value }
    setFormData(updated)
    const validation = await validateWorkOrderForm(updated)
    setFormErrors(validation.errors)
  }

  const handleSubmitForm = async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: WorkOrder | null,
    onSuccess: (msg: string) => void,
    onAdd: typeof addWorkOrder,
    onEdit: typeof editWorkOrder,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = await validateWorkOrderForm(formData)

    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const result = isEditMode && initialData?._id ? await onEdit(initialData._id, formData) : await onAdd(formData)
      onSuccess(result.message)
    } catch (err) {
      console.error("Error al guardar orden:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      instalacionId: "",
      estado: "pendiente",
      prioridad: "media",
      tipoTrabajo: "mantenimiento",
      fechaProgramada: new Date(),
      horaProgramada: "09:00",
    })
    setFormErrors({})
  }

  const setFormValues = (data: Partial<WorkOrder>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  return {
    workOrders,
    technicians,
    installations,
    loading,
    loadingInstallations,
    error,
    errorLoadingInstallations,
    loadWorkOrders,
    loadInstallations,
    loadTechnicians,
    addWorkOrder,
    editWorkOrder,
    removeWorkOrder,
    assignTechnician,
    completeWorkOrder,
    startWorkOrder,
    formData,
    setFormData,
    formErrors,
    handleFieldChange,
    handleSubmitForm,
    isSubmitting,
    setFormErrors,
    resetForm,
    setFormValues,
  }
}

export default useWorkOrders

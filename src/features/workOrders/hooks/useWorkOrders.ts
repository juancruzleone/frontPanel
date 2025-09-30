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
import { useTranslation } from 'react-i18next'

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
    fechaProgramada: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    horaProgramada: "09:00",
    observaciones: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation();

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
    console.log("assignTechnician llamado con:", { workOrderId, technicianId })
    try {
      await assignTechnicianToWorkOrder(workOrderId, technicianId)
      console.log("assignTechnicianToWorkOrder completado exitosamente")
      await loadWorkOrders()
      console.log("loadWorkOrders completado exitosamente")
      return { message: "Técnico asignado con éxito" }
    } catch (error) {
      console.error("Error en assignTechnician:", error)
      throw error
    }
  }

  const completeWorkOrder = async (id: string, data: any) => {
    try {
      const result = await apiCompleteWorkOrder(id, data)
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
      return { message: "Orden de trabajo completada con éxito" }
    } catch (error) {
      console.error("Error al completar orden:", error)
      throw error
    }
  }

  const startWorkOrder = async (id: string) => {
    try {
      await apiStartWorkOrder(id)
      setWorkOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, estado: "en_progreso", fechaInicio: new Date() } : o)),
      )
      return { message: "Orden de trabajo iniciada con éxito" }
    } catch (error) {
      console.error("Error al iniciar orden:", error)
      throw error
    }
  }

  // Función simplificada para manejar cambios de campo
  const handleFieldChange = useCallback(
    (name: string, value: string | any) => {
      console.log(`Cambiando campo ${name} a:`, value)

      setFormData((prevFormData) => {
        const updated = { ...prevFormData, [name]: value }
        console.log("FormData actualizado:", updated)
        return updated
      })

      // Limpiar error del campo si existe
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    },
    [formErrors],
  )

  const handleSubmitForm = async (
    e: React.FormEvent,
    isEditMode: boolean,
    initialData: WorkOrder | null,
    onSuccess: (msg: string) => void,
    onError: (msg: string) => void,
    onAdd?: typeof addWorkOrder,
    onEdit?: typeof editWorkOrder,
  ) => {
    e.preventDefault()
    setIsSubmitting(true)

    const validation = await validateWorkOrderForm(formData, t)

    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setIsSubmitting(false)
      return
    }

    try {
      const result =
        isEditMode && initialData?._id && onEdit
          ? await onEdit(initialData._id, formData as WorkOrder)
          : onAdd
            ? await onAdd(formData as WorkOrder)
            : { message: "Error: función no definida" }

      onSuccess(result.message)
      resetForm()
    } catch (err: any) {
      console.error("Error al guardar orden:", err)
      onError(err.message || "Error al guardar la orden de trabajo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = useCallback(() => {
    setFormData({
      titulo: "",
      descripcion: "",
      instalacionId: "",
      estado: "pendiente",
      prioridad: "media",
      tipoTrabajo: "mantenimiento",
      fechaProgramada: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      horaProgramada: "09:00",
      observaciones: "",
    })
    setFormErrors({})
  }, [])

  const extractInstalacionId = useCallback((data: any): string => {
    if (typeof data === "string") {
      return data
    }
    if (data && typeof data === "object" && data.$oid) {
      return data.$oid
    }
    if (data && typeof data === "object" && typeof data.toString === "function") {
      return data.toString()
    }
    return ""
  }, [])

  const setFormValues = useCallback(
    (data: Partial<WorkOrder>, availableInstallations: Installation[] = []) => {
      console.log("🔍 [setFormValues] Llamado con data:", data)
      console.log("🔍 [setFormValues] Instalaciones disponibles:", availableInstallations.length)

      let instalacionId = ""
      let instalacionObject = data.instalacion

      // Extraer instalacionId
      if (data.instalacionId) {
        instalacionId = extractInstalacionId(data.instalacionId)
        console.log("🔍 [setFormValues] instalacionId extraído de data.instalacionId:", instalacionId)
      } else if (data.instalacion?._id) {
        instalacionId = extractInstalacionId(data.instalacion._id)
        console.log("🔍 [setFormValues] instalacionId extraído de data.instalacion._id:", instalacionId)
      }

      // Si tenemos instalaciones disponibles, verificar y corregir el instalacionId
      if (availableInstallations.length > 0) {
        console.log("🔍 [setFormValues] Buscando instalación con ID:", instalacionId)
        
        if (instalacionId) {
          const foundInstallation = availableInstallations.find((inst) => inst._id === instalacionId)
          console.log("🔍 [setFormValues] Instalación encontrada por ID:", foundInstallation ? "SÍ" : "NO")
          
          if (!foundInstallation) {
            // Si no se encuentra por ID, intentar buscar por nombre de empresa
            if (data.instalacion?.company) {
              console.log("🔍 [setFormValues] Buscando por nombre de empresa:", data.instalacion.company)
              const foundByName = availableInstallations.find((inst) => inst.company === data.instalacion?.company)
              if (foundByName) {
                instalacionId = foundByName._id
                instalacionObject = foundByName
                console.log("✅ [setFormValues] Instalación encontrada por nombre, nuevo ID:", instalacionId)
              }
            }
          } else {
            instalacionObject = foundInstallation
            console.log("✅ [setFormValues] Usando instalación encontrada por ID")
          }
        } else if (data.instalacion?.company) {
          // Si no hay instalacionId pero sí hay objeto instalacion, buscar por nombre
          console.log("🔍 [setFormValues] No hay instalacionId, buscando por nombre:", data.instalacion.company)
          const foundByName = availableInstallations.find((inst) => inst.company === data.instalacion?.company)
          if (foundByName) {
            instalacionId = foundByName._id
            instalacionObject = foundByName
            console.log("✅ [setFormValues] Instalación encontrada por nombre, ID:", instalacionId)
          }
        }
      }

      // Usar la fecha como string YYYY-MM-DD si es posible
      let fechaProgramada = ""
      if (typeof data.fechaProgramada === "string") {
        fechaProgramada = data.fechaProgramada.length > 10 ? data.fechaProgramada.split('T')[0] : data.fechaProgramada
      } else if (data.fechaProgramada instanceof Date) {
        fechaProgramada = data.fechaProgramada.toISOString().split('T')[0]
      } else {
        fechaProgramada = new Date().toISOString().split('T')[0]
      }

      const updatedFormData = {
        titulo: data.titulo || "",
        descripcion: data.descripcion || "",
        instalacionId: instalacionId,
        estado: data.estado || "pendiente",
        prioridad: data.prioridad || "media",
        tipoTrabajo: data.tipoTrabajo || "mantenimiento",
        fechaProgramada,
        horaProgramada: data.horaProgramada || "09:00",
        observaciones: data.observaciones || "",
        instalacion: instalacionObject || undefined,
      }

      console.log("✅ [setFormValues] FormData final:", updatedFormData)
      console.log("✅ [setFormValues] instalacionId final:", instalacionId)
      setFormData(updatedFormData)
      setFormErrors({})
    },
    [extractInstalacionId],
  )

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

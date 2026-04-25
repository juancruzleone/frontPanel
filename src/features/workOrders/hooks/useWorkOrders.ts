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
import { useTimeZone } from "../../calendar/hooks/useTimeZone"

export type Technician = {
  _id: string
  userName: string
  email?: string
  role: string
  firstName?: string
  lastName?: string
  profilePhoto?: string
}

export type Installation = {
  _id: string
  company: string
  address: string
  city?: string
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
  tipoOrden?: string
  origen?: string
  fechaProgramada: Date | string
  horaProgramada: string
  tecnicoAsignado?: string
  tecnicosAsignados?: string[]
  tecnicosIds?: string[]
  tecnico?: Technician | Technician[] | string
  tecnicos?: Technician[]
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
  inventoryPartsUsed?: {
    inventoryItemId: string
    nameSnapshot: string
    unit: string
    quantity: number
    movementId?: string
  }[]
  tiempoTrabajo?: number
  estadoDispositivo?: string
  evidenciaFoto?: string
  firmaTecnico?: string
  formularioRespuestas?: Record<string, unknown>
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
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  })
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
    tipoOrden: "correctivo",
    origen: "manual",
    fechaProgramada: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    horaProgramada: "09:00",
    observaciones: "",
    tecnicoAsignado: "",
    tecnicosAsignados: [],
    tecnicosIds: [],
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation();

  const normalizeTechnicianIds = useCallback((data: Partial<WorkOrder> | WorkOrder) => {
    const candidates = [
      ...(Array.isArray(data?.tecnicosAsignados) ? data.tecnicosAsignados : []),
      ...(Array.isArray(data?.tecnicosIds) ? data.tecnicosIds : []),
      data?.tecnicoAsignado,
    ];

    return Array.from(new Set(candidates.filter(Boolean).map((id) => String(id))));
  }, []);

  const loadTechnicians = useCallback(async () => {
    try {
      const data = await fetchTechnicians()
      setTechnicians(data)
      return data
    } catch (err) {
      console.error('Error loading technicians:', err);
      setTechnicians([])
      return []
    }
  }, [])

  const loadWorkOrders = useCallback(async (page = 1, limit = 10, filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const { data, pagination: pagData } = await fetchWorkOrders(page, limit, filters)
      setWorkOrders(data)
      setPagination(pagData)
    } catch (err: unknown) {
      setError((err as Error).message)
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
    } catch (err: unknown) {
      setErrorLoadingInstallations((err as Error).message || "Error al cargar instalaciones")
      setInstallations([])
    } finally {
      setLoadingInstallations(false)
    }
  }, [])

  const { timeZone, offset } = useTimeZone()

  const addWorkOrder = async (workOrder: WorkOrder) => {
    let fechaHoraISO = workOrder.fechaProgramada as string;
    if (typeof workOrder.fechaProgramada === 'string' && workOrder.horaProgramada) {
      try {
        // Combinamos fecha y hora para crear un Date real y que Yup.date().min(new Date()) en el backend
        // no falle asumiendo que es medianoche UTC (que puede ser en el pasado).
        const dateStr = workOrder.fechaProgramada.includes('T')
          ? workOrder.fechaProgramada.split('T')[0]
          : workOrder.fechaProgramada;
        const localDate = new Date(`${dateStr}T${workOrder.horaProgramada}`);
        if (!isNaN(localDate.getTime())) {
          fechaHoraISO = localDate.toISOString();
        }
      } catch (_e) { 
        console.error('Error parsing date/time for work order:', _e);
      }
    }

    const technicianIds = normalizeTechnicianIds(workOrder);
    const workOrderWithTZ = {
      ...workOrder,
      tipoOrden: workOrder.tipoOrden || "correctivo",
      origen: workOrder.origen || "manual",
      tecnicoAsignado: technicianIds[0] || undefined,
      tecnicosAsignados: technicianIds,
      tecnicosIds: technicianIds,
      fechaProgramada: fechaHoraISO,
      timezone: timeZone,
      userOffset: offset
    }
    const newOrder = await createWorkOrder(workOrderWithTZ)
    setWorkOrders((prev) => [newOrder, ...prev])
    return { message: "Orden de trabajo creada con éxito" }
  }

  const editWorkOrder = async (id: string, updatedData: WorkOrder) => {
    let fechaHoraISO = updatedData.fechaProgramada as string;
    if (typeof updatedData.fechaProgramada === 'string' && updatedData.horaProgramada) {
      try {
        const dateStr = updatedData.fechaProgramada.includes('T')
          ? updatedData.fechaProgramada.split('T')[0]
          : updatedData.fechaProgramada;
        const localDate = new Date(`${dateStr}T${updatedData.horaProgramada}`);
        if (!isNaN(localDate.getTime())) {
          fechaHoraISO = localDate.toISOString();
        }
      } catch (_e) {
        console.error('Error parsing date/time for editing work order:', _e);
      }
    }

    const technicianIds = normalizeTechnicianIds(updatedData);
    const payload = {
      ...updatedData,
      tipoOrden: updatedData.tipoOrden || "correctivo",
      origen: updatedData.origen || "manual",
      tecnicoAsignado: technicianIds[0] || undefined,
      tecnicosAsignados: technicianIds,
      tecnicosIds: technicianIds,
      fechaProgramada: fechaHoraISO
    };

    const updated = await updateWorkOrder(id, payload)
    setWorkOrders((prev) => prev.map((o) => (o._id === id ? updated : o)))
    return { message: "Orden de trabajo actualizada con éxito" }
  }

  const removeWorkOrder = async (id: string) => {
    await deleteWorkOrder(id)
    setWorkOrders((prev) => prev.filter((o) => o._id !== id))
  }

  const assignTechnician = async (workOrderId: string, technicianIds: string[]) => {
    await assignTechnicianToWorkOrder(workOrderId, technicianIds)
    await loadWorkOrders()
    return { message: "Técnico asignado con éxito" }
  }

  const completeWorkOrder = async (id: string, data: Record<string, unknown>) => {
    const result = await apiCompleteWorkOrder(id, data)
    setWorkOrders((prev) =>
      prev.map((o) =>
        o._id === id
          ? {
            ...o,
            estado: "completada",
            fechaCompletada: new Date(),
            trabajoRealizado: data.trabajoRealizado as string,
            observaciones: data.observaciones as string,
            tiempoTrabajo: data.tiempoTrabajo as number,
            estadoDispositivo: data.estadoDispositivo as string,
            evidenciaFoto: data.evidenciaFoto as string,
            firmaTecnico: data.firmaTecnico as string,
            inventoryPartsUsed: data.inventoryPartsUsed as any,
            ...result,
          }
          : o,
      ),
    )
    return { message: "Orden de trabajo completada con éxito" }
  }

  const startWorkOrder = async (id: string) => {
    await apiStartWorkOrder(id)
    setWorkOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, estado: "en_progreso", fechaInicio: new Date() } : o)),
    )
    return { message: "Orden de trabajo iniciada con éxito" }
  }

  // Función simplificada para manejar cambios de campo
  const handleFieldChange = useCallback(
    (name: string, value: unknown) => {

      setFormData((prevFormData) => {
        const updated = { ...prevFormData, [name]: value }

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

    const validation = await validateWorkOrderForm(formData as unknown as Record<string, unknown>, t)

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
    } catch (err: unknown) {
      onError((err as Error).message || "Error al guardar la orden de trabajo")
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
      tipoOrden: "correctivo",
      origen: "manual",
      fechaProgramada: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      horaProgramada: "09:00",
      observaciones: "",
      tecnicoAsignado: "",
      tecnicosAsignados: [],
      tecnicosIds: [],
    })
    setFormErrors({})
  }, [])

  const extractInstalacionId = useCallback((data: unknown): string => {
    if (typeof data === "string") {
      return data
    }
    if (data && typeof data === "object" && (data as { $oid?: string }).$oid) {
      return (data as { $oid: string }).$oid
    }
    if (data && typeof data === "object" && typeof data.toString === "function") {
      return data.toString()
    }
    return ""
  }, [])

  const setFormValues = useCallback(
    (data: Partial<WorkOrder>, availableInstallations: Installation[] = []) => {



      let instalacionId = ""
      let instalacionObject = data.instalacion

      // Extraer instalacionId
      if (data.instalacionId) {
        instalacionId = extractInstalacionId(data.instalacionId)

      } else if (data.instalacion?._id) {
        instalacionId = extractInstalacionId(data.instalacion._id)

      }

      // Si tenemos instalaciones disponibles, verificar y corregir el instalacionId
      if (availableInstallations.length > 0) {


        if (instalacionId) {
          const foundInstallation = availableInstallations.find((inst) => inst._id === instalacionId)


          if (!foundInstallation) {
            // Si no se encuentra por ID, intentar buscar por nombre de empresa
            if (data.instalacion?.company) {

              const foundByName = availableInstallations.find((inst) => inst.company === data.instalacion?.company)
              if (foundByName) {
                instalacionId = foundByName._id
                instalacionObject = foundByName

              }
            }
          } else {
            instalacionObject = foundInstallation

          }
        } else if (data.instalacion?.company) {
          // Si no hay instalacionId pero sí hay objeto instalacion, buscar por nombre

          const foundByName = availableInstallations.find((inst) => inst.company === data.instalacion?.company)
          if (foundByName) {
            instalacionId = foundByName._id
            instalacionObject = foundByName

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
        tipoOrden: data.tipoOrden || "correctivo",
        origen: data.origen || "manual",
        fechaProgramada,
        horaProgramada: data.horaProgramada || "09:00",
        observaciones: data.observaciones || "",
        tecnicoAsignado: data.tecnicoAsignado || "",
        tecnicosAsignados: normalizeTechnicianIds(data),
        tecnicosIds: normalizeTechnicianIds(data),
        instalacion: instalacionObject || undefined,
      }



      setFormData(updatedFormData)
      setFormErrors({})
    },
    [extractInstalacionId, normalizeTechnicianIds],
  )

  return {
    workOrders,
    pagination,
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

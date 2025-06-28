import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

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

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  const token = getToken()

  try {
    // Obtener órdenes de trabajo
    const ordersResponse = await fetch(`${API_URL}ordenes-trabajo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!ordersResponse.ok) throw new Error("Error al obtener órdenes de trabajo")

    const ordersData = await ordersResponse.json()
    const workOrders = ordersData.data || ordersData

    // Verificar si las órdenes ya tienen la información del técnico poblada
    if (workOrders.some((order: any) => order.tecnico && order.tecnico.userName)) {
      return workOrders
    }

    // Si no está poblado, obtener técnicos y enriquecer
    const techResponse = await fetch(`${API_URL}cuentas/tecnicos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!techResponse.ok) throw new Error("Error al obtener técnicos")

    const techData = await techResponse.json()
    const allTechnicians = techData.tecnicos || techData || []

    // Enriquecer órdenes con información de técnicos
    return workOrders.map((order: any) => {
      // Si ya tiene técnico completo, dejarlo como está
      if (order.tecnico && order.tecnico.userName) {
        return order
      }

      // Buscar técnico por tecnicoAsignado
      if (order.tecnicoAsignado) {
        const foundTech = allTechnicians.find((t: any) => t._id === order.tecnicoAsignado)
        if (foundTech) {
          return {
            ...order,
            tecnico: foundTech,
          }
        }
      }

      return order
    })
  } catch (error) {
    console.error("Error en fetchWorkOrders:", error)
    throw error
  }
}

export const fetchInstallations = async (): Promise<Installation[]> => {
  const token = getToken()
  const response = await fetch(`${API_URL}installations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al obtener instalaciones")

  const result = await response.json()
  return Array.isArray(result) ? result : []
}

export const createWorkOrder = async (workOrder: WorkOrder) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(workOrder),
  })

  if (!response.ok) throw new Error("Error al crear orden de trabajo")

  const result = await response.json()
  return result.data || result
}

export const updateWorkOrder = async (id: string, workOrder: WorkOrder) => {
  const token = getToken()
  const { _id, ...rest } = workOrder

  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(rest),
  })

  if (!response.ok) throw new Error("Error al actualizar orden de trabajo")

  const result = await response.json()
  return result.data || result
}

export const deleteWorkOrder = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al eliminar orden de trabajo")

  return await response.json()
}

export const assignTechnicianToWorkOrder = async (workOrderId: string, technicianId: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/asignar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tecnicoId: technicianId }),
  })

  if (!response.ok) throw new Error("Error al asignar técnico")

  const result = await response.json()
  return result
}

export const completeWorkOrder = async (workOrderId: string, completionData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/completar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(completionData),
  })

  if (!response.ok) throw new Error("Error al completar orden de trabajo")

  const result = await response.json()
  return result.data || result
}

export const startWorkOrder = async (workOrderId: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/iniciar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al iniciar orden de trabajo")

  const result = await response.json()
  return result.data || result
}

export const getWorkOrderById = async (id: string): Promise<WorkOrder> => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al obtener orden de trabajo")

  const result = await response.json()
  return result.data || result
}

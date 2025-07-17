import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL
console.log("API_URL:", API_URL)

const getToken = () => {
  const token = useAuthStore.getState().token
  console.log("getToken llamado, token:", token ? "Presente" : "Ausente")
  return token
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

const handleResponse = async (response: Response) => {
  console.log("handleResponse llamado con status:", response.status)
  if (!response.ok) {
    console.log("Response no ok, intentando parsear error")
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    console.log("Error parseado:", error)
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }
  console.log("Response ok, parseando JSON")
  const result = await response.json()
  console.log("Result parseado:", result)
  return result
}

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  const token = getToken()
  try {
    const ordersResponse = await fetch(`${API_URL}ordenes-trabajo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const ordersData = await handleResponse(ordersResponse)
    const workOrders = ordersData.data || ordersData

    if (workOrders.some((order: any) => order.tecnico && order.tecnico.userName)) {
      return workOrders
    }

    const techResponse = await fetch(`${API_URL}cuentas/tecnicos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const techData = await handleResponse(techResponse)
    const allTechnicians = techData.tecnicos || techData || []

    return workOrders.map((order: any) => {
      if (order.tecnico && order.tecnico.userName) return order

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

  const result = await handleResponse(response)
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

  const result = await handleResponse(response)
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

  const result = await handleResponse(response)
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

  return handleResponse(response)
}

export const assignTechnicianToWorkOrder = async (workOrderId: string, technicianId: string) => {
  console.log("assignTechnicianToWorkOrder llamado con:", { workOrderId, technicianId })
  const token = getToken()
  console.log("Token obtenido:", token ? "Sí" : "No")
  
  const url = `${API_URL}ordenes-trabajo/${workOrderId}/asignar`
  const body = JSON.stringify({ tecnicoId: technicianId })
  console.log("URL:", url)
  console.log("Body:", body)
  
  // Usar PATCH según la configuración del backend
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body,
  })

  console.log("Response status:", response.status)
  console.log("Response ok:", response.ok)
  console.log("Response headers:", Object.fromEntries(response.headers.entries()))

  return handleResponse(response)
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

  const result = await handleResponse(response)
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

  const result = await handleResponse(response)
  return result.data || result
}

export const getWorkOrderById = async (id: string): Promise<WorkOrder> => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const result = await handleResponse(response)
  return result.data || result
}

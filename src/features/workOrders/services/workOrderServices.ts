import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL


const getToken = () => {
  const token = useAuthStore.getState().token

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

  if (!response.ok) {

    const error = await response.json().catch(() => ({ message: "Error de conexión" }))

    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()

  return result
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const fetchWorkOrders = async (page = 1, limit = 10, filters: any = {}): Promise<PaginatedResponse<WorkOrder>> => {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    })

    const ordersResponse = await fetch(`${API_URL}ordenes-trabajo?${queryParams}`, {
      headers: getAuthHeaders(),
    })

    const ordersData = await handleResponse(ordersResponse)

    return {
      data: ordersData.data || [],
      pagination: ordersData.pagination || {
        total: (ordersData.data || []).length,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    }
  } catch (error) {
    console.error("Error en fetchWorkOrders:", error)
    throw error
  }
}

export const fetchInstallations = async (): Promise<Installation[]> => {
  const response = await fetch(`${API_URL}installations`, {
    headers: getAuthHeaders(),
  })

  const result = await handleResponse(response)
  return Array.isArray(result) ? result : (result.data || [])
}

export const createWorkOrder = async (workOrder: WorkOrder) => {
  const response = await fetch(`${API_URL}ordenes-trabajo`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(workOrder),
  })

  const result = await handleResponse(response)
  return result.data || result
}

export const updateWorkOrder = async (id: string, workOrder: WorkOrder) => {
  const { _id, ...rest } = workOrder

  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(rest),
  })

  const result = await handleResponse(response)
  return result.data || result
}

export const deleteWorkOrder = async (id: string) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return handleResponse(response)
}

export const assignTechnicianToWorkOrder = async (workOrderId: string, technicianId: string) => {
  // console.log('DEBUG: Assigning technician', { workOrderId, technicianId })

  const url = `${API_URL}ordenes-trabajo/${workOrderId}/asignar`
  const body = JSON.stringify({ tecnicoId: technicianId })



  // Usar PATCH según la configuración del backend
  const response = await fetch(url, {
    method: "PATCH",
    headers: getHeadersWithContentType(),
    body: body,
  })



  // console.log('DEBUG: Assign response received')

  return handleResponse(response)
}

export const completeWorkOrder = async (workOrderId: string, completionData: any) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/completar`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(completionData),
  })

  const result = await handleResponse(response)
  return result.data || result
}

export const startWorkOrder = async (workOrderId: string) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/iniciar`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  })

  const result = await handleResponse(response)
  return result.data || result
}

export const getWorkOrderById = async (id: string): Promise<WorkOrder> => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}`, {
    headers: getAuthHeaders(),
  })

  const result = await handleResponse(response)
  return result.data || result
}

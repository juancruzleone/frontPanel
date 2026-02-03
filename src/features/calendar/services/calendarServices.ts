import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

export const fetchWorkOrders = async (filters: any = {}): Promise<any[]> => {
  const queryParams = new URLSearchParams(filters).toString()
  console.log('Calendar API - Fetching work orders with filters:', filters);
  console.log('Calendar API - Query params:', queryParams);
  console.log('Calendar API - Full URL:', `${API_URL}calendario${queryParams ? `?${queryParams}` : ""}`);
  
  const response = await fetch(`${API_URL}calendario${queryParams ? `?${queryParams}` : ""}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    console.error('Calendar API - Response not OK:', response.status, response.statusText);
    throw new Error("Error al obtener órdenes de trabajo")
  }

  const result = await response.json()
  console.log('Calendar API - Response:', result);
  console.log('Calendar API - Data length:', result.success ? result.data?.length : result?.length);
  
  return result.success ? result.data : result
}

export const startWorkOrder = async (id: string) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}/iniciar`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  })

  if (!response.ok) throw new Error("Error al iniciar orden de trabajo")

  const result = await response.json()
  return result.success ? result.data : result
}

export const assignTechnicianToWorkOrder = async (workOrderId: string, technicianId: string) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${workOrderId}/asignar`, {
    method: "PATCH",
    headers: getHeadersWithContentType(),
    body: JSON.stringify({ tecnicoId: technicianId }),
  })

  if (!response.ok) throw new Error("Error al asignar técnico")

  const result = await response.json()
  return result.success ? result.data : result
}

export const completeWorkOrder = async (id: string, data: any) => {
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}/completar`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(data),
  })

  if (!response.ok) throw new Error("Error al completar orden de trabajo")

  const result = await response.json()
  return result.success ? result.data : result
}

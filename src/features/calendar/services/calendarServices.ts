import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

export const fetchWorkOrders = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}ordenes-trabajo`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) throw new Error("Error al obtener órdenes de trabajo")

  const result = await response.json()
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

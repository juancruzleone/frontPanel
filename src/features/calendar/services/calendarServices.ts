import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

export const fetchWorkOrders = async (): Promise<any[]> => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al obtener órdenes de trabajo")

  const result = await response.json()
  return result.success ? result.data : result
}

export const startWorkOrder = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}/iniciar`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) throw new Error("Error al iniciar orden de trabajo")

  const result = await response.json()
  return result.success ? result.data : result
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
  return result.success ? result.data : result
}

export const completeWorkOrder = async (id: string, data: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}ordenes-trabajo/${id}/completar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) throw new Error("Error al completar orden de trabajo")

  const result = await response.json()
  return result.success ? result.data : result
}

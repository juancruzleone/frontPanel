import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

const getToken = (): string => {
  const token = useAuthStore.getState().token
  if (!token) {
    throw new Error("No authentication token found")
  }
  return token
}

export interface Technician {
  _id: string
  userName: string
  role: string
}

export const fetchTechnicians = async (): Promise<Technician[]> => {
  const token = getToken()
  const response = await fetch(`${API_URL}cuentas/tecnicos`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al obtener técnicos")
  }

  const result = await response.json()
  return result?.tecnicos || []
}

export const createTechnician = async (technicianData: Partial<Technician>) => {
  const token = getToken()
  const response = await fetch(`${API_URL}/cuenta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(technicianData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al crear técnico")
  }

  return await response.json()
}

export const updateTechnician = async (id: string, technicianData: Partial<Technician>) => {
  const token = getToken()
  const response = await fetch(`${API_URL}/cuentas/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(technicianData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al actualizar técnico")
  }

  return await response.json()
}

export const deleteTechnician = async (id: string) => {
  const token = getToken()
  const response = await fetch(`${API_URL}/cuentas/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al eliminar técnico")
  }

  return await response.json()
}

export const getTechnicianById = async (id: string): Promise<Technician> => {
  const token = getToken()
  const response = await fetch(`${API_URL}/cuentas/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al obtener técnico")
  }

  return await response.json()
}

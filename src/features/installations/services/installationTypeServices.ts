import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }
  return await response.json()
}

export const fetchInstallationTypes = async (includeInactive = false): Promise<any[]> => {
  const token = getToken()
  const response = await fetch(`${API_URL}tipos-instalacion?includeInactive=${includeInactive}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return handleResponse(response)
}

export const createInstallationType = async (typeData: any) => {
  const token = getToken()
  const response = await fetch(`${API_URL}tipos-instalacion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(typeData),
  })
  return handleResponse(response)
}

import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de conexión" }))
    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }
  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchInstallationTypes = async (includeInactive = false): Promise<any[]> => {
  console.log('=== DEBUG INSTALLATION TYPE SERVICE ===')
  console.log('API_URL:', API_URL)
  console.log('Headers:', getAuthHeaders())
  console.log('URL:', `${API_URL}tipos-instalacion?includeInactive=${includeInactive}`)
  
  const response = await fetch(`${API_URL}tipos-instalacion?includeInactive=${includeInactive}`, {
    headers: getAuthHeaders(),
  })
  
  console.log('Response status:', response.status)
  console.log('Response ok:', response.ok)
  console.log('Response headers:', Object.fromEntries(response.headers.entries()))
  
  const result = await handleResponse(response)
  console.log('Result:', result)
  console.log('=====================================')
  
  // El backend ya filtra por tenantId usando el token JWT
  return Array.isArray(result) ? result : []
}

export const createInstallationType = async (typeData: any) => {
  const response = await fetch(`${API_URL}tipos-instalacion`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(typeData),
  })
  return handleResponse(response)
}

export const updateInstallationType = async (id: string, typeData: any) => {
  const response = await fetch(`${API_URL}tipos-instalacion/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(typeData),
  })
  return handleResponse(response)
}

export const deleteInstallationType = async (id: string) => {
  const response = await fetch(`${API_URL}tipos-instalacion/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  return handleResponse(response)
}

export const getInstallationTypeById = async (id: string) => {
  const response = await fetch(`${API_URL}tipos-instalacion/${id}`, {
    headers: getAuthHeaders(),
  })
  return handleResponse(response)
}

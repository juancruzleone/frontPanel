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
  
  // FILTRO TEMPORAL EN FRONTEND - Eliminar cuando el backend esté corregido
  // TODO: El backend debe filtrar por x-tenant-id en el endpoint GET /tipos-instalacion
  // Por ahora, filtramos en el frontend para evitar mostrar tipos de otros tenants
  const { tenantId } = useAuthStore.getState()
  console.log('TenantId del usuario:', tenantId)
  
  let filteredResult = Array.isArray(result) ? result : []
  
  // Si hay tenantId en el store, filtrar por él
  if (tenantId) {
    filteredResult = filteredResult.filter((type: any) => {
      // Si el tipo tiene tenantId, verificar que coincida
      if (type.tenantId) {
        const matches = type.tenantId === tenantId
        console.log(`Tipo "${type.nombre}": tenantId=${type.tenantId}, matches=${matches}`)
        return matches
      }
      // Si no tiene tenantId, incluir (para compatibilidad con datos existentes)
      console.log(`Tipo "${type.nombre}": sin tenantId, incluyendo`)
      return true
    })
  }
  
  console.log('Resultado filtrado:', filteredResult)
  return filteredResult
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

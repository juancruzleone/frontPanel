import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const { token, tenantId } = useAuthStore.getState()
  
  // IMPORTANTE: No usar fallback hardcodeado
  // Si no hay tenantId, el backend debe rechazar la petición
  const headers: Record<string, string> = {}
  
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }
  
  return headers
}

export const getHeadersWithContentType = () => {
  return getAuthHeaders(true)
}

export const getHeadersWithoutContentType = () => {
  return getAuthHeaders(false)
} 
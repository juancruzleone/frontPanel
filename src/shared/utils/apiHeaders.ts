import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const { token, tenantId } = useAuthStore.getState()

  const headers: Record<string, string> = {}

  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId
  } else {
    console.warn('⚠️ [API HEADERS] No hay tenantId en el store');
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  } else {
    console.error('❌ [API HEADERS] No hay token en el store');
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
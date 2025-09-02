import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const { token, tenantId } = useAuthStore.getState()
  
  const headers: Record<string, string> = {
    "X-Tenant-ID": tenantId || "051935e5-1c2f-4661-82a5-587f78c99e5d", // Fallback al tenant por defecto
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
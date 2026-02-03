import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const { token, tenantId } = useAuthStore.getState()

  // console.log('DEBUG: Headers Check', { tokenPresent: !!token, tenantIdPresent: !!tenantId });

  // IMPORTANTE: No usar fallback hardcodeado
  // Si no hay tenantId, el backend debe rechazar la petición
  const headers: Record<string, string> = {}

  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId

  } else {
    console.warn('⚠️ [API HEADERS] No hay tenantId en el store');
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`

  } else {
    console.error('❌ [API HEADERS] No hay token en el store');
  }

  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }

  // console.log('DEBUG: Constructed Headers', headers);


  return headers
}

export const getHeadersWithContentType = () => {
  return getAuthHeaders(true)
}

export const getHeadersWithoutContentType = () => {
  return getAuthHeaders(false)
} 
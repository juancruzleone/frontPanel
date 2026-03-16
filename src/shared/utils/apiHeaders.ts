import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const authState = useAuthStore.getState()
  const { token, tenantId } = authState

  console.log('🔐 getAuthHeaders llamado:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    hasTenantId: !!tenantId,
    tokenPreview: token ? `${token.substring(0, 15)}...` : '❌ NO TOKEN',
    fullAuthState: {
      user: authState.user,
      userId: authState.userId,
      role: authState.role,
      isAuthenticated: authState.isAuthenticated
    }
  })

  const headers: Record<string, string> = {}

  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  } else {
    console.error('❌❌❌ NO HAY TOKEN EN EL STORE ❌❌❌')
    console.error('Estado completo del auth:', authState)
  }

  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }

  console.log('📋 Headers construidos:', {
    'Content-Type': headers['Content-Type'] || 'NO',
    'Authorization': headers['Authorization'] ? '✅ PRESENTE' : '❌ AUSENTE',
    'X-Tenant-ID': headers['X-Tenant-ID'] || 'NO'
  })

  return headers
}

export const getHeadersWithContentType = () => {
  return getAuthHeaders(true)
}

export const getHeadersWithoutContentType = () => {
  return getAuthHeaders(false)
} 
import { useAuthStore } from "../../store/authStore"

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const { token, tenantId } = useAuthStore.getState()
  
  console.log('🔍 [API HEADERS] Estado del store:', { 
    tieneToken: !!token, 
    tieneTenantId: !!tenantId,
    tokenInicio: token ? token.substring(0, 20) : 'NO HAY TOKEN'
  });
  
  // IMPORTANTE: No usar fallback hardcodeado
  // Si no hay tenantId, el backend debe rechazar la petición
  const headers: Record<string, string> = {}
  
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId
    console.log('✅ [API HEADERS] X-Tenant-ID agregado:', tenantId);
  } else {
    console.warn('⚠️ [API HEADERS] No hay tenantId en el store');
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
    console.log('✅ [API HEADERS] Authorization agregado');
  } else {
    console.error('❌ [API HEADERS] No hay token en el store');
  }
  
  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }
  
  console.log('📦 [API HEADERS] Headers finales:', Object.keys(headers));
  console.log('📦 [API HEADERS] Headers completos:', headers);
  
  return headers
}

export const getHeadersWithContentType = () => {
  return getAuthHeaders(true)
}

export const getHeadersWithoutContentType = () => {
  return getAuthHeaders(false)
} 
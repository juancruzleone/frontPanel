import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { refreshSession } from "@/shared/services/authRefreshService"

// Methods that require CSRF token
const CSRF_REQUIRED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
const AUTH_ERROR_CODES = new Set([
  'TOKEN_EXPIRED',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_MISSING',
  'REFRESH_REUSE_DETECTED',
  'INVALID_TOKEN',
  'UNAUTHENTICATED',
  'USER_NOT_AUTHENTICATED',
])
const CSRF_ERROR_CODES = new Set(['CSRF_TOKEN_MISSING', 'CSRF_TOKEN_INVALID'])

export const getErrorCode = (value: any): string | undefined => (
  value?.error?.code || value?.code
)

/**
 * Checks if an error is an authentication/session error.
 */
export const isAuthError = (error: unknown) => {
  if (!error) return false
  
  const status = (error as any)?.status
  const code = getErrorCode(error)

  return status === 401 || Boolean(code && AUTH_ERROR_CODES.has(code))
}

/**
 * Fetch wrapper that handles both CSRF 403 errors and Auth 401 TOKEN_EXPIRED errors.
 * Shares a single mutex for concurrent refresh calls.
 */
export const fetchWithAuthRetry = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const method = (options.method || 'GET').toUpperCase()
  
  const executeFetch = async (currentOptions: RequestInit) => {
    const fetchOptions: RequestInit = {
      ...currentOptions,
      credentials: currentOptions.credentials ?? "include",
      headers: {
        ...currentOptions.headers,
        ...getApiHeaders(hasJsonContentType(currentOptions.headers), method),
      },
    }
    return fetch(url, fetchOptions)
  }

  const response = await executeFetch(options)

  // Handle 401 TOKEN_EXPIRED
  if (response.status === 401) {
    const clone = response.clone()
    const data = await clone.json().catch(() => ({}))

    if (getErrorCode(data) === 'TOKEN_EXPIRED') {
      const refreshData = await refreshSession()
      
      // Update CSRF token if returned
      if (refreshData?.csrfToken) {
        useCSRFStore.setState({ token: refreshData.csrfToken })
      }

      // Retry original request
      return await executeFetch(options)
    }
  }

  // Handle 403 CSRF (existing logic fallback or integrated)
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}))
    const code = getErrorCode(data)
    if (code && CSRF_ERROR_CODES.has(code)) {
      await useCSRFStore.getState().fetchToken()
      return await executeFetch(options)
    }
  }

  return response
}

/**
 * Wrapper for backward compatibility or CSRF-only specific needs.
 * Now delegates to fetchWithAuthRetry for unified handling.
 */
export const fetchWithCsrf = fetchWithAuthRetry

export const getAuthHeaders = (includeContentType: boolean = false) => {
  const authState = useAuthStore.getState()
  const { tenantId, role } = authState

  const headers: Record<string, string> = {}

  // Only send X-Tenant-ID for super_admin flows if selected. Normal users should rely on JWT.
  if (tenantId && role === "super_admin") {
    headers["X-Tenant-ID"] = tenantId
  }

  // Ya no enviamos Authorization header - el backend usa cookies HTTP-only

  headers["X-Requested-With"] = "XMLHttpRequest"

  if (includeContentType) {
    headers["Content-Type"] = "application/json"
  }

  return headers
}

/**
 * Get headers for API requests with optional CSRF token.
 * CSRF token is included for mutating methods (POST, PUT, DELETE, PATCH).
 * 
 * @param includeContentType - Whether to include Content-Type header
 * @param method - HTTP method (used to determine if CSRF is needed)
 */
export const getApiHeaders = (
  includeContentType: boolean = false,
  method: string = 'GET'
): Record<string, string> => {
  const headers = getAuthHeaders(includeContentType)
  
  // Add CSRF token for mutating methods
  if (CSRF_REQUIRED_METHODS.includes(method.toUpperCase())) {
    const csrfState = useCSRFStore.getState()
    if (csrfState.token) {
      headers['X-CSRF-Token'] = csrfState.token
    }
  }

  return headers
}

/**
 * Get headers with CSRF token for mutations.
 * Use this for POST, PUT, DELETE, PATCH requests.
 */
export const getHeadersWithCsrf = (includeContentType: boolean = true) => {
  return getApiHeaders(includeContentType, 'POST')
}

export const getHeadersWithContentType = (method: string = 'POST') => {
  return getApiHeaders(true, method)
}

export const getHeadersWithoutContentType = (method: string = 'GET') => {
  return getApiHeaders(false, method)
} 

const hasJsonContentType = (headers?: HeadersInit): boolean => {
  if (!headers) return false

  if (headers instanceof Headers) {
    return headers.has("Content-Type")
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "content-type")
  }

  return Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
}

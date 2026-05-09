import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"

// Methods that require CSRF token
const CSRF_REQUIRED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

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

/**
 * Fetch wrapper that handles CSRF 403 errors with automatic token refresh and retry.
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, headers, body)
 * @param maxRetries - Maximum retry attempts (default: 1)
 * @returns The fetch response
 * @throws Error if all retries fail
 */
export const fetchWithCsrf = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 1
): Promise<Response> => {
  const method = (options.method || 'GET').toUpperCase()
  
  // Only add CSRF for mutating methods
  if (CSRF_REQUIRED_METHODS.includes(method)) {
    const csrfStore = useCSRFStore.getState()

    if (!csrfStore.token) {
      await csrfStore.fetchToken()
    }

    // Get current headers with CSRF token
    const headers = getApiHeaders(
      hasJsonContentType(options.headers),
      method
    )
    
    const fetchOptions: RequestInit = {
      ...options,
      credentials: options.credentials ?? "include",
      headers: {
        ...options.headers,
        ...headers,
      },
    }
    
    let lastError: Error | null = null
    let attempt = 0
    
    while (attempt <= maxRetries) {
      attempt++
      const response = await fetch(url, fetchOptions)
      
      if (response.status !== 403) {
        // Success or other error - return response
        return response
      }
      
      // 403 error - try to refresh token and retry
      try {
        const csrfStore = useCSRFStore.getState()
        await csrfStore.fetchToken()
        
        // Get new headers with refreshed CSRF token
        const newHeaders = getApiHeaders(
          hasJsonContentType(options.headers),
          method
        )
        
        fetchOptions.headers = {
          ...options.headers,
          ...newHeaders,
        }
      } catch (refreshError: unknown) {
        const message = refreshError instanceof Error ? refreshError.message : "Error al refrescar token CSRF"
        lastError = new Error(message)
        break // Don't retry if token refresh fails
      }
    }
    
    // All retries exhausted
    if (lastError) {
      throw lastError
    }
    
    // If we get here, we need to fetch again (last attempt)
    return fetch(url, fetchOptions)
  }
  
  // Non-mutating request - just fetch normally
  return fetch(url, {
    ...options,
    credentials: options.credentials ?? "include",
  })
}

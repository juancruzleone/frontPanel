/**
 * Helpers de seguridad para el frontend
 */

/**
 * Genera un nonce aleatorio para CSP
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Valida que el origen de un mensaje sea confiable
 */
export const isValidOrigin = (origin: string): boolean => {
  const allowedOrigins = [
    'https://leonix.net.ar',
    'https://www.leonix.net.ar',
    'https://api.leonix.net.ar',
    'https://leonix.netlify.app',
    'https://panelmantenimiento.netlify.app',
  ]
  
  if (import.meta.env.DEV) {
    allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173')
  }
  
  return allowedOrigins.includes(origin)
}

/**
 * Implementa rate limiting básico en el frontend
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minuto
  ) {}
  
  canMakeRequest(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Filtrar requests dentro de la ventana de tiempo
    const recentRequests = requests.filter(time => now - time < this.windowMs)
    
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    // Agregar el request actual
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    
    return true
  }
  
  reset(key: string): void {
    this.requests.delete(key)
  }
  
  resetAll(): void {
    this.requests.clear()
  }
}

/**
 * Debounce para prevenir múltiples requests
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle para limitar frecuencia de ejecución
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Verifica si el navegador soporta características de seguridad
 */
export const checkSecurityFeatures = () => {
  return {
    crypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    localStorage: (() => {
      try {
        const test = '__storage_test__'
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    })(),
    serviceWorker: 'serviceWorker' in navigator,
    https: window.location.protocol === 'https:',
  }
}

/**
 * Limpia datos sensibles de objetos antes de logging
 */
export const sanitizeForLogging = (obj: any): any => {
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'authorization']
  
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item))
  }
  
  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Valida headers de respuesta de seguridad
 */
export const validateSecurityHeaders = (headers: Headers): {
  valid: boolean
  missing: string[]
} => {
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
  ]
  
  const missing = requiredHeaders.filter(header => !headers.has(header))
  
  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Implementa timeout para requests
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Verifica integridad de recursos (SRI)
 */
export const verifyResourceIntegrity = async (
  url: string,
  expectedHash: string
): Promise<boolean> => {
  try {
    const response = await fetch(url)
    const content = await response.text()
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-384', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
    
    return `sha384-${hashBase64}` === expectedHash
  } catch {
    return false
  }
}

export default {
  generateNonce,
  isValidOrigin,
  RateLimiter,
  debounce,
  throttle,
  checkSecurityFeatures,
  sanitizeForLogging,
  validateSecurityHeaders,
  fetchWithTimeout,
  verifyResourceIntegrity,
}

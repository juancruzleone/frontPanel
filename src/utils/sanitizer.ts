/**
 * Utilidades de sanitización para prevenir XSS
 * 
 * IMPORTANTE: React ya escapa automáticamente el contenido,
 * pero estas funciones son útiles para casos especiales donde
 * necesites sanitizar contenido antes de procesarlo.
 */

/**
 * Escapa caracteres HTML peligrosos
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Sanitiza una URL para prevenir javascript: y data: URIs peligrosos
 */
export const sanitizeUrl = (url: string): string => {
  const trimmed = url.trim()

  if (!trimmed) {
    return 'about:blank'
  }

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://frontend.local'
    const parsed = new URL(trimmed, baseUrl)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'about:blank'
    }

    return parsed.toString()
  } catch {
    return 'about:blank'
  }
}

export const openSafeUrl = (url: string, target: '_blank' | '_self' = '_blank'): boolean => {
  const safeUrl = sanitizeUrl(url)

  if (safeUrl === 'about:blank' || typeof window === 'undefined') {
    return false
  }

  window.open(safeUrl, target, 'noopener,noreferrer')
  return true
}

export const redirectToSafeUrl = (url: string): boolean => {
  const safeUrl = sanitizeUrl(url)

  if (safeUrl === 'about:blank' || typeof window === 'undefined') {
    return false
  }

  window.location.assign(safeUrl)
  return true
}

/**
 * Sanitiza input de usuario removiendo caracteres peligrosos
 */
export const sanitizeInput = (input: string): string => {
  // Remover caracteres de control y caracteres especiales peligrosos
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Caracteres de control
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Tags de script
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // iframes
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Event handlers con comillas
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '') // Event handlers sin comillas
    .replace(/javascript:/gi, '') // Protocolo javascript:
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '') // javascript: en href
    .trim()
}

/**
 * Valida que un string sea un email válido
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida que un string sea una URL válida
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Sanitiza un objeto completo recursivamente
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized as T
}

/**
 * Valida y sanitiza datos de formulario
 */
export const sanitizeFormData = <T extends Record<string, unknown>>(data: T): T => {
  return sanitizeObject(data)
}

/**
 * Previene ataques de path traversal
 */
export const sanitizePath = (path: string): string => {
  return path
    .replace(/\.\./g, '') // Remover ..
    .replace(/[<>:"|?*]/g, '') // Remover caracteres inválidos en paths
    .replace(/^\/+/, '') // Remover slashes al inicio
    .trim()
}

/**
 * Sanitiza nombres de archivo
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Solo permitir caracteres seguros
    .replace(/\.{2,}/g, '.') // Prevenir múltiples puntos
    .substring(0, 255) // Limitar longitud
}

/**
 * Valida que un token JWT tenga el formato correcto
 */
export const isValidJWT = (token: string): boolean => {
  // Verificar formato básico: tres partes separadas por puntos
  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }
  
  // Verificar que cada parte tenga contenido válido (base64url)
  const jwtPartRegex = /^[A-Za-z0-9-_]+$/
  
  // Todas las partes deben tener contenido y ser válidas
  // La primera parte (header) debe tener al menos 10 caracteres
  // La segunda parte (payload) debe tener al menos 10 caracteres
  // La tercera parte (signature) puede estar vacía o tener contenido
  if (parts[0].length < 10 || !jwtPartRegex.test(parts[0])) {
    return false
  }
  
  if (parts[1].length < 10 || !jwtPartRegex.test(parts[1])) {
    return false
  }
  
  // La signature puede estar vacía o debe ser válida
  if (parts[2].length > 0 && !jwtPartRegex.test(parts[2])) {
    return false
  }
  
  return true
}

/**
 * Sanitiza contenido HTML (para casos donde necesites renderizar HTML)
 * NOTA: Preferir siempre React's JSX sobre renderizar HTML directamente
 */
export const sanitizeHtml = (html: string): string => {
  // Remover scripts
  let sanitized = html.replace(/<script[^>]*>.*?<\/script>/gi, '')
  
  // Remover event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  
  // Remover javascript: URIs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
  
  return sanitized
}

export default {
  escapeHtml,
  sanitizeUrl,
  openSafeUrl,
  redirectToSafeUrl,
  sanitizeInput,
  sanitizeObject,
  sanitizeFormData,
  sanitizePath,
  sanitizeFilename,
  isValidEmail,
  isValidUrl,
  isValidJWT,
  sanitizeHtml,
}

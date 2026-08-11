export class ApiResponseError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
    this.details = details
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringifyErrorValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!isRecord(value)) return ''

  const candidateKeys = ['message', 'msg', 'error', 'detail', 'details', 'title', 'code']
  const candidates = candidateKeys
    .map((key) => stringifyErrorValue(value[key]))
    .filter(Boolean)

  if (candidates.length > 0) return candidates.join(' - ')

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export const getErrorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado'): string => {
  if (error instanceof Error) return error.message || fallback
  if (typeof error === 'string') return error

  const message = stringifyErrorValue(error)
  return message || fallback
}

export const createApiResponseError = async (
  response: Response,
  fallback = 'Error al procesar la solicitud',
) => {
  let details: unknown

  try {
    details = await response.clone().json()
  } catch {
    try {
      details = await response.text()
    } catch {
      details = undefined
    }
  }

  const parsedMessage = getErrorMessage(details, '')
  const message = parsedMessage || `${fallback} (${response.status})`

  return new ApiResponseError(message, response.status, details)
}

/**
 * Determina si la solicitud falló antes de recibir una respuesta HTTP.
 */
export const isOfflineError = (error: unknown): boolean => {
  if (error instanceof ApiResponseError) return false

  const message = getErrorMessage(error, '').toLowerCase()
  const code = isRecord(error) && typeof error.code === 'string'
    ? error.code.toLowerCase()
    : ''
  const isBrowserNetworkTypeError = error instanceof TypeError && (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed')
  )

  return (
    isBrowserNetworkTypeError ||
    message === 'networkerror' ||
    message.startsWith('networkerror:') ||
    message.includes('err_internet_disconnected') ||
    message.includes('internet disconnected') ||
    code === 'err_internet_disconnected' ||
    code === 'err_network' ||
    code === 'network_error'
  )
}

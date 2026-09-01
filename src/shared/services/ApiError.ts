export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: string[]
  }
  message?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly payload: ApiErrorPayload | null

  constructor(status: number, payload: ApiErrorPayload | null, fallbackMessage: string) {
    super(payload?.error?.message || payload?.message || fallbackMessage)
    this.name = "ApiError"
    this.status = status
    this.code = payload?.error?.code
    this.payload = payload
  }
}

export const isRetriableRequestError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500
  }

  return error instanceof TypeError
}

export const parseJsonResponse = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const throwApiError = async (response: Response, fallbackMessage: string): Promise<never> => {
  const payload = await parseJsonResponse<ApiErrorPayload>(response)
  throw new ApiError(response.status, payload, fallbackMessage)
}

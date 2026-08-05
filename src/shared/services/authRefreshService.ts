const API_URL = import.meta.env.VITE_API_URL || "/api/";

export class AuthApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "AuthApiError"
    this.status = status
    this.code = code
  }
}

type RefreshSessionResponse = { csrfToken?: string; [key: string]: unknown }

let refreshPromise: Promise<RefreshSessionResponse> | null = null

const parseJsonSafely = async (response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const executeRefresh = async () => {
  const response = await fetch(`${API_URL}refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  })

  if (!response.ok) {
    const errorData = await parseJsonSafely(response)
    throw new AuthApiError(
      errorData?.error?.message ||
      errorData?.message ||
      `Error al refrescar sesión (${response.status})`,
      response.status,
      errorData?.error?.code || errorData?.code,
    )
  }

  const data = await parseJsonSafely(response)

  if (!data) {
    throw new Error("La respuesta del refresh no tuvo un JSON válido")
  }

  return data
}

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = executeRefresh().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

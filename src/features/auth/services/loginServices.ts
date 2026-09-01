import { fetchWithAuthRetry } from "@/shared/utils/apiHeaders"
import { parseJsonResponse, throwApiError } from "@/shared/services/ApiError"
import type { LoginResponse } from "@/store/authStore"

const API_URL = import.meta.env.VITE_API_URL || "/api/";

const getSessionHeaders = (): Record<string, string> => {
  return {}
}

export const userLogin = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}cuenta/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userName: username, password }),
  })

  if (!response.ok) {
    return throwApiError(response, `Error al iniciar sesión (${response.status})`)
  }

  const data = await parseJsonResponse<LoginResponse>(response)

  if (!data) {
    throw new Error("La respuesta del login no tuvo un JSON válido")
  }

  return data
}

export const verifySession = async (): Promise<LoginResponse> => {
  const response = await fetchWithAuthRetry(`${API_URL}verify`, {
    method: "GET",
  })

  if (!response.ok) {
    return throwApiError(response, "Sesión no válida")
  }

  const data = await parseJsonResponse<LoginResponse>(response)

  if (!data) {
    throw new Error("La verificación de sesión devolvió una respuesta inválida")
  }

  return data
}

export const logoutSession = async (csrfToken?: string | null) => {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...getSessionHeaders(),
  }

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken
  }

  const response = await fetch(`${API_URL}cuenta`, {
    method: "DELETE",
    credentials: "include",
    headers,
  })

  if (!response.ok) {
    return throwApiError(response, "No se pudo cerrar la sesión")
  }

  const data = await parseJsonResponse<Record<string, unknown>>(response)
  return data || { message: "Sesión cerrada correctamente" }
}

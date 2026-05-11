import { useAuthStore } from "../../../store/authStore"

const API_URL = import.meta.env.VITE_API_URL || "/api/";

const getSessionHeaders = (): Record<string, string> => {
  return {}
}

const parseJsonSafely = async (response: Response) => {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const userLogin = async (username: string, password: string) => {
  const response = await fetch(`${API_URL}cuenta/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userName: username, password }),
  })

  if (!response.ok) {
    const errorData = await parseJsonSafely(response)
    throw new Error(
      errorData?.error?.message ||
      errorData?.message ||
      `Error al iniciar sesión (${response.status})`
    )
  }

  const data = await parseJsonSafely(response)

  if (!data) {
    throw new Error("La respuesta del login no tuvo un JSON válido")
  }

  return data
}

export const verifySession = async () => {
  const response = await fetch(`${API_URL}verify`, {
    method: "GET",
    credentials: "include",
    headers: getSessionHeaders(),
  })

  if (!response.ok) {
    throw new Error("Sesión no válida")
  }

  const data = await parseJsonSafely(response)

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
    const errorData = await parseJsonSafely(response)
    throw new Error(
      errorData?.error?.message ||
      errorData?.message ||
      "No se pudo cerrar la sesión"
    )
  }

  const data = await parseJsonSafely(response)
  return data || { message: "Sesión cerrada correctamente" }
}

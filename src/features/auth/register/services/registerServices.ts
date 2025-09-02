import { getHeadersWithContentType, getAuthHeaders } from "../../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

export const userRegister = async (username: string, password: string, token: string) => {
  const headers = getHeadersWithContentType()
  headers.Authorization = `Bearer ${token}` // Sobrescribir el token del store con el token pasado como parámetro
  
  const response = await fetch(`${API_URL}cuenta`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      userName: username,
      password: password,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()

    // Manejar errores de validación específicos
    if (errorData.error.details && Array.isArray(errorData.error.details)) {
      throw new Error(errorData.error.details.join(", "))
    }

    throw new Error(errorData.error.message || "Error al registrar el técnico")
  }

  return await response.json()
}

export const getTechnicians = async (token: string) => {
  const headers = getAuthHeaders()
  headers.Authorization = `Bearer ${token}` // Sobrescribir el token del store con el token pasado como parámetro
  
  const response = await fetch(`${API_URL}cuentas/tecnicos`, {
    method: "GET",
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error.message || "Error al obtener técnicos")
  }

  const data = await response.json()

  // El backend devuelve { message, count, tecnicos }
  // Extraer solo el array de técnicos
  return data.tecnicos || []
}

export const deleteTechnician = async (id: string, token: string) => {
  const headers = getAuthHeaders()
  headers.Authorization = `Bearer ${token}` // Sobrescribir el token del store con el token pasado como parámetro
  
  const response = await fetch(`${API_URL}cuentas/${id}`, {
    method: "DELETE",
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al eliminar usuario")
  }

  return await response.json()
}

export const getUserById = async (id: string, token: string) => {
  const headers = getAuthHeaders()
  headers.Authorization = `Bearer ${token}` // Sobrescribir el token del store con el token pasado como parámetro
  
  const response = await fetch(`${API_URL}cuentas/${id}`, {
    method: "GET",
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al obtener datos del usuario")
  }

  return await response.json()
}

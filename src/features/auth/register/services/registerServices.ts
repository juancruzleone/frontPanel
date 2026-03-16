import { getHeadersWithContentType, getAuthHeaders } from "../../../../shared/utils/apiHeaders"
import { detectPlanLimitError } from "../../../../shared/utils/planLimitErrorHandler"

const API_URL = import.meta.env.VITE_API_URL

export const userRegister = async (
  username: string, 
  password: string, 
  fullName: string, 
  token: string,
  email?: string,
  documento?: string,
  profilePhoto?: File | null
) => {
  const headers = getAuthHeaders() // Usar getAuthHeaders en lugar de getHeadersWithContentType
  headers.Authorization = `Bearer ${token}`
  
  // Separar fullName en firstName y lastName
  const nameParts = fullName.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  // Crear FormData para enviar archivos
  const formData = new FormData()
  formData.append('userName', username)
  formData.append('password', password)
  // ✅ YA NO ES NECESARIO ENVIAR EL ROL - El backend lo establece automáticamente
  formData.append('firstName', firstName) // ✅ Enviar firstName
  formData.append('lastName', lastName) // ✅ Enviar lastName
  
  if (email) {
    formData.append('email', email)
  }
  if (documento) {
    formData.append('documento', documento)
  }
  if (profilePhoto) {
    formData.append('profilePhoto', profilePhoto)
  }
  
  // ✅ USAR LA NUEVA RUTA ESPECÍFICA PARA TÉCNICOS
  const response = await fetch(`${API_URL}cuenta/tecnico`, {
    method: "POST",
    headers, // No incluir Content-Type, el navegador lo establecerá automáticamente con el boundary
    body: formData, // Enviar FormData en lugar de JSON
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

export const updateTechnician = async (id: string, data: { userName?: string; password?: string; name?: string; email?: string }, token: string) => {
  const headers = getHeadersWithContentType()
  headers.Authorization = `Bearer ${token}`
  
  const response = await fetch(`${API_URL}cuentas/${id}/technician`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || "Error al actualizar el técnico")
  }

  return await response.json()
}

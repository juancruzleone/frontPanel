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
  
  console.log('🔍 getUserById - ID:', id);
  console.log('🔍 getUserById - Token:', token ? 'Presente' : 'Ausente');
  console.log('🔍 getUserById - URL:', `${API_URL}cuentas/${id}`);
  console.log('🔍 getUserById - Headers:', headers);
  
  const response = await fetch(`${API_URL}cuentas/${id}`, {
    method: "GET",
    headers,
  })

  console.log('📡 getUserById - Response status:', response.status);
  console.log('📡 getUserById - Response ok:', response.ok);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('❌ getUserById - Error data:', errorData);
    
    // Mensajes de error más específicos
    if (response.status === 404) {
      throw new Error(`Usuario no encontrado (ID: ${id})`)
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('No tienes permisos para ver este usuario')
    }
    
    throw new Error(errorData.error?.message || errorData.message || "Error al obtener datos del usuario")
  }

  const data = await response.json()
  console.log('✅ getUserById - Data:', data);
  
  return data
}

export const updateTechnician = async (
  id: string, 
  data: { 
    userName?: string
    password?: string
    firstName?: string
    lastName?: string
    email?: string
    documento?: string
    profilePhoto?: File | null
  }, 
  token: string
) => {
  // ⚠️ NOTA: El backend NO tiene endpoint para que un admin actualice otro usuario
  // Solo existe PUT /profile para que el usuario actualice su propio perfil
  // Por ahora, usamos el endpoint genérico de actualización de perfil
  
  const headers = getAuthHeaders()
  headers.Authorization = `Bearer ${token}`
  
  // Si hay foto, usar FormData
  if (data.profilePhoto) {
    const formData = new FormData()
    
    if (data.userName) formData.append('userName', data.userName)
    if (data.password) formData.append('password', data.password)
    if (data.firstName) formData.append('firstName', data.firstName)
    if (data.lastName) formData.append('lastName', data.lastName)
    if (data.email) formData.append('email', data.email)
    if (data.documento) formData.append('documento', data.documento)
    formData.append('profilePhoto', data.profilePhoto)
    
    // Usar el endpoint de perfil (el único que existe)
    const response = await fetch(`${API_URL}profile`, {
      method: "PUT",
      headers, // No incluir Content-Type para FormData
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ updateTechnician - Error:', errorData)
      throw new Error(errorData.error?.message || errorData.message || "Error al actualizar el técnico")
    }

    return await response.json()
  }
  
  // Si no hay foto, usar JSON
  const headers2 = getHeadersWithContentType()
  headers2.Authorization = `Bearer ${token}`
  
  const response = await fetch(`${API_URL}profile`, {
    method: "PUT",
    headers: headers2,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('❌ updateTechnician - Error:', errorData)
    throw new Error(errorData.error?.message || errorData.message || "Error al actualizar el técnico")
  }

  return await response.json()
}

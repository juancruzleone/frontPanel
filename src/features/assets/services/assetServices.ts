import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL

const getToken = () => {
  return useAuthStore.getState().token
}

export const fetchAssets = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}activos`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener activos")
  }

  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchTemplates = async (): Promise<any[]> => {
  console.log('=== DEBUG ASSETS TEMPLATES SERVICE ===')
  console.log('API_URL:', API_URL)
  console.log('Headers:', getAuthHeaders())
  console.log('URL:', `${API_URL}plantillas`)
  
  const response = await fetch(`${API_URL}plantillas`, {
    headers: getAuthHeaders(),
  })

  console.log('Response status:', response.status)
  console.log('Response ok:', response.ok)
  console.log('Response headers:', Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener plantillas")
  }

  const result = await response.json()
  console.log('Result:', result)
  console.log('=====================================')
  
  return result.success ? result.data : result
}

export const createAsset = async (asset: any) => {
  const response = await fetch(`${API_URL}activos`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(asset),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear activo")
  }

  const result = await response.json()
  return result.success ? result.data : result
}

export const updateAsset = async (id: string, asset: any) => {
  const { _id, ...rest } = asset

  const response = await fetch(`${API_URL}activos/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(rest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar activo")
  }

  // Manejar respuesta vacía
  const text = await response.text()
  if (!text) {
    return null
  }
  
  const result = JSON.parse(text)
  return result.success ? result.data : result
}

export const deleteAsset = async (id: string) => {
  const response = await fetch(`${API_URL}activos/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar activo")
  }

  // Manejar respuesta vacía
  const text = await response.text()
  if (!text) {
    return null
  }
  
  const result = JSON.parse(text)
  return result.success ? result.data : result
}

export const assignTemplateToAsset = async (assetId: string, templateId: string) => {
  const response = await fetch(`${API_URL}activos/${assetId}/plantilla`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify({ templateId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al asignar plantilla al activo")
  }

  const result = await response.json()
  return result.success ? result.data : result
}
import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType, fetchWithCsrf } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export const fetchAssets = async (params: { page?: number, limit?: number, search?: string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)

  const url = `${API_URL}activos?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    let errorMessage = "Error al obtener activos";
    try {
      const error = await response.json()
      errorMessage = error.message || errorMessage;
    } catch {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage)
  }

  const result = await response.json()
  
  // Devolver la respuesta tal cual viene del backend
  // El backend devuelve: { assets: [...], total, totalPages }
  return result;
}

export const fetchTemplates = async (params: { page?: number, limit?: number, search?: string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)

  const response = await fetch(`${API_URL}plantillas?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener plantillas")
  }

  const result = await response.json()
  // El backend devuelve { success: true, data: templates, pagination: {...} }
  // Extraer solo el array de templates
  return result.success && result.data ? result.data : []
}

export const createAsset = async (asset: any) => {
  const response = await fetchWithCsrf(`${API_URL}activos`, {
    method: "POST",
    headers: getHeadersWithContentType("POST"),
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

  const response = await fetchWithCsrf(`${API_URL}activos/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType("PUT"),
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
  const response = await fetchWithCsrf(`${API_URL}activos/${id}`, {
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
  const response = await fetchWithCsrf(`${API_URL}activos/${assetId}/plantilla`, {
    method: "POST",
    headers: getHeadersWithContentType("POST"),
    body: JSON.stringify({ templateId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al asignar plantilla al activo")
  }

  const result = await response.json()
  return result.success ? result.data : result
}

export const updateAssetStock = async (assetId: string, stock: number): Promise<void> => {
  const response = await fetchWithCsrf(`${API_URL}activos/${assetId}/stock`, {
    method: "PUT",
    headers: getHeadersWithContentType("PUT"),
    body: JSON.stringify({ stock }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || "Error al actualizar el stock")
  }
}

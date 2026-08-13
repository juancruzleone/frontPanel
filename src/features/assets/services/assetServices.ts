import { useAuthStore } from "../../../store/authStore"
import { getAuthHeaders, getHeadersWithContentType, fetchWithAuthRetry, fetchWithCsrf } from "../../../shared/utils/apiHeaders"
import type { CsvImportPreview } from "../../../shared/components/CsvImportDialog/CsvImportDialog"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json()
    return body.error?.message || body.message || body.error || fallback
  } catch { return `Error ${response.status}: ${response.statusText}` }
}

const downloadResponse = async (response: Response, fallback: string, filename: string) => {
  if (!response.ok) throw new Error(await parseErrorMessage(response, fallback))
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const fetchAssets = async (params: { page?: number, limit?: number, search?: string, category?: string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)
  if (params.category) queryParams.append('category', params.category)

  const url = `${API_URL}activos?${queryParams.toString()}`;

  const response = await fetchWithAuthRetry(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
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

  const response = await fetchWithAuthRetry(`${API_URL}plantillas?${queryParams.toString()}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
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

export interface AssetImportPreview extends CsvImportPreview {
  rows: Array<CsvImportPreview["rows"][number] & { templateExternalId?: string, initialStock: number }>
}

export const downloadAssetTemplate = async () => {
  const response = await fetch(`${API_URL}activos/csv/template`, { headers: getAuthHeaders(), credentials: "include" })
  await downloadResponse(response, "Error al descargar la plantilla", "assets-template.csv")
}

export const previewAssetImport = async (file: File): Promise<AssetImportPreview> => {
  const form = new FormData()
  form.append("file", file)
  const response = await fetchWithCsrf(`${API_URL}activos/csv/import/preview`, { method: "POST", body: form })
  if (!response.ok) throw new Error(await parseErrorMessage(response, "Error al previsualizar el CSV"))
  return response.json()
}

export const commitAssetImport = async (preview: AssetImportPreview) => {
  const response = await fetchWithCsrf(`${API_URL}activos/csv/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": preview.token },
    body: JSON.stringify({ token: preview.token, payloadHash: preview.payloadHash }),
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response, "Error al confirmar la importación"))
  return response.json()
}

export const downloadAssetImportErrors = async (token: string) => {
  const response = await fetch(`${API_URL}activos/csv/import/${encodeURIComponent(token)}/errors`, { headers: getAuthHeaders(), credentials: "include" })
  await downloadResponse(response, "Error al descargar los errores", "assets-import-errors.csv")
}

export const exportAssets = async (params: { search?: string, category?: string } = {}) => {
  const query = new URLSearchParams()
  if (params.search) query.set("search", params.search)
  if (params.category) query.set("category", params.category)
  const response = await fetch(`${API_URL}activos/csv/export?${query.toString()}`, { headers: getAuthHeaders(), credentials: "include" })
  await downloadResponse(response, "Error al exportar activos", "assets.csv")
}

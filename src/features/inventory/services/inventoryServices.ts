import { getAuthHeaders, fetchWithAuthRetry, fetchWithCsrf } from "../../../shared/utils/apiHeaders"
import { fetchAssets, updateAssetStock as apiUpdateAssetStock } from "../../assets/services/assetServices"
import { InventoryAdjustmentPayload, InventoryAsset, InventoryItem, InventoryMovement } from "../types/inventory.types"
import type { CsvImportPreview } from "../../../shared/components/CsvImportDialog/CsvImportDialog"
import { downloadResponse } from "../../../shared/utils/downloadResponse"

const getApiUrl = () => import.meta.env.VITE_API_URL || '/api/'

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const error = await response.json()
    return error.message || error.error || fallback
  } catch {
    return `Error ${response.status}: ${response.statusText}`
  }
}

const extractArrayResponse = <T>(result: unknown, keys: string[]): T[] => {
  if (Array.isArray(result)) return result as T[]

  if (!result || typeof result !== 'object') return []

  const response = result as Record<string, unknown>
  for (const key of keys) {
    const value = response[key]
    if (Array.isArray(value)) return value as T[]
  }

  if (response.success && Array.isArray(response.data)) return response.data as T[]

  return []
}

export interface InventoryListResponse {
  items?: InventoryItem[];
  total?: number;
  totalPages?: number;
}

export interface InventoryImportPreview extends CsvImportPreview {
  rows: Array<CsvImportPreview['rows'][number] & { stockDelta: number, data: Partial<InventoryItem> }>
}

export const fetchInventoryItems = async (params: { page?: number, limit?: number, name?: string, category?: string, lowStock?: boolean | string } = {}): Promise<InventoryListResponse> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.name) queryParams.append('name', params.name)
  if (params.category) queryParams.append('category', params.category)
  if (params.lowStock !== undefined) queryParams.append('lowStock', params.lowStock.toString())

  const url = `${getApiUrl()}inventario?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener items de inventario"))
  }

  return await response.json()
}

export const fetchInventoryAssets = async (): Promise<InventoryAsset[]> => {
  const result = await fetchAssets({ page: 1, limit: 1000 })
  return extractArrayResponse<InventoryAsset>(result, ['assets', 'activos', 'items'])
}

export const fetchInventoryItemById = async (id: string): Promise<InventoryItem> => {
  const response = await fetch(`${getApiUrl()}inventario/${id}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener item")
  }

  return await response.json()
}

export const createInventoryItem = async (item: Partial<InventoryItem>): Promise<InventoryItem> => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear item")
  }

  return await response.json()
}

export const updateInventoryItem = async (id: string, item: Partial<InventoryItem>): Promise<InventoryItem> => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar item")
  }

  return await response.json()
}

export const deleteInventoryItem = async (id: string) => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar item")
  }

  return await response.json()
}

export const createInventoryMovement = async (movement: Partial<InventoryMovement>): Promise<InventoryMovement> => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/movimientos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(movement),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear movimiento")
  }

  return await response.json()
}

export const createInventoryAdjustment = async (payload: InventoryAdjustmentPayload): Promise<InventoryMovement> => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/ajustes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al ajustar stock"))
  }

  return await response.json()
}

export const fetchInventoryMovements = async (itemId?: string, params: { page?: number, limit?: number } = {}): Promise<InventoryMovement[]> => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const url = itemId 
        ? `${getApiUrl()}inventario/${itemId}/movimientos?${queryParams.toString()}`
        : `${getApiUrl()}inventario/movimientos?${queryParams.toString()}`

    const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al obtener movimientos")
    }

    const result = await response.json()
    return extractArrayResponse<InventoryMovement>(result, ['movements', 'items'])
}

export const updateInventoryAssetStock = async (assetId: string, stock: number): Promise<void> => {
  await apiUpdateAssetStock(assetId, stock)
}

export const downloadInventoryTemplate = async () => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}inventario/csv/template`, { headers: getAuthHeaders() })
  await downloadResponse(response, 'Error al descargar la plantilla', 'inventory-template.csv')
}

export const previewInventoryImport = async (file: File): Promise<InventoryImportPreview> => {
  const form = new FormData()
  form.append('file', file)
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/csv/import/preview`, { method: 'POST', body: form })
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'Error al previsualizar el CSV'))
  return response.json()
}

export const commitInventoryImport = async (preview: InventoryImportPreview) => {
  const response = await fetchWithCsrf(`${getApiUrl()}inventario/csv/import/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': preview.token },
    body: JSON.stringify({ token: preview.token, payloadHash: preview.payloadHash }),
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response, 'Error al confirmar la importación'))
  return response.json()
}

export const downloadInventoryImportErrors = async (token: string) => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}inventario/csv/import/${encodeURIComponent(token)}/errors`, { headers: getAuthHeaders() })
  await downloadResponse(response, 'Error al descargar los errores', 'inventory-import-errors.csv')
}

export const exportInventory = async (params: { name?: string, category?: string, lowStock?: boolean } = {}) => {
  const query = new URLSearchParams()
  if (params.name) query.set('name', params.name)
  if (params.category) query.set('category', params.category)
  if (params.lowStock !== undefined) query.set('lowStock', String(params.lowStock))
  const response = await fetchWithAuthRetry(`${getApiUrl()}inventario/csv/export?${query.toString()}`, { headers: getAuthHeaders() })
  await downloadResponse(response, 'Error al exportar inventario', 'inventory.csv')
}

export const exportInventoryMovements = async (itemId: string) => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}inventario/${encodeURIComponent(itemId)}/movimientos/csv/export`, { headers: getAuthHeaders() })
  await downloadResponse(response, 'Error al exportar movimientos', 'inventory-movements.csv')
}

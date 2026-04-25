import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const getApiUrl = () => import.meta.env.VITE_API_URL || '/api/'

export const fetchInventoryItems = async (params: { page?: number, limit?: number, name?: string, category?: string, lowStock?: boolean | string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.name) queryParams.append('name', params.name)
  if (params.category) queryParams.append('category', params.category)
  if (params.lowStock !== undefined) queryParams.append('lowStock', params.lowStock.toString())

  const url = `${getApiUrl()}inventario?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      let errorMessage = "Error al obtener items de inventario";
      try {
        const error = await response.json()
        errorMessage = error.message || errorMessage;
      } catch (e) {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
}

export const fetchInventoryItemById = async (id: string): Promise<any> => {
  const response = await fetch(`${getApiUrl()}inventario/${id}`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener item")
  }

  return await response.json()
}

export const createInventoryItem = async (item: any) => {
  const response = await fetch(`${getApiUrl()}inventario`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear item")
  }

  return await response.json()
}

export const updateInventoryItem = async (id: string, item: any) => {
  const response = await fetch(`${getApiUrl()}inventario/${id}`, {
    method: "PATCH",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar item")
  }

  return await response.json()
}

export const deleteInventoryItem = async (id: string) => {
  const response = await fetch(`${getApiUrl()}inventario/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar item")
  }

  return await response.json()
}

export const createInventoryMovement = async (movement: any) => {
  const response = await fetch(`${getApiUrl()}inventario/movimientos`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(movement),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear movimiento")
  }

  return await response.json()
}

export const fetchInventoryMovements = async (itemId?: string, params: { page?: number, limit?: number } = {}): Promise<any> => {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const url = itemId 
        ? `${getApiUrl()}inventario/${itemId}/movimientos?${queryParams.toString()}`
        : `${getApiUrl()}inventario/movimientos?${queryParams.toString()}`

    const response = await fetch(url, {
        headers: getAuthHeaders(),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al obtener movimientos")
    }

    return await response.json()
}

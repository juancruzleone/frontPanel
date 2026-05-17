import { getAuthHeaders, fetchWithCsrf } from "../../../shared/utils/apiHeaders"
import type { Supplier } from "../../../store/supplierStore"

const getApiUrl = () => import.meta.env.VITE_API_URL || '/api/'

interface SupplierListResponse {
  suppliers: Supplier[]
  total: number
}

type SupplierPayload = Omit<Supplier, '_id'>

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const error = await response.json()
    return error.message || error.error?.message || error.error || fallback
  } catch {
    return `Error ${response.status}: ${response.statusText}`
  }
}

const normalizeSuppliersResponse = (result: unknown): SupplierListResponse => {
  if (Array.isArray(result)) {
    return { suppliers: result as Supplier[], total: result.length }
  }

  if (!result || typeof result !== 'object') {
    return { suppliers: [], total: 0 }
  }

  const response = result as Record<string, unknown>
  const supplierKeys = ['suppliers', 'proveedores', 'data', 'items']

  for (const key of supplierKeys) {
    const value = response[key]
    if (Array.isArray(value)) {
      const total = typeof response.total === 'number' ? response.total : value.length
      return { suppliers: value as Supplier[], total }
    }
  }

  return { suppliers: [], total: 0 }
}

export const fetchSuppliers = async (params: { page?: number, limit?: number, name?: string } = {}): Promise<SupplierListResponse> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.name) queryParams.append('name', params.name)

  const url = `${getApiUrl()}proveedores?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener proveedores"))
  }

  return normalizeSuppliersResponse(await response.json())
}

export const createSupplier = async (supplier: SupplierPayload): Promise<Supplier> => {
  const response = await fetchWithCsrf(`${getApiUrl()}proveedores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al crear proveedor"))
  }

  return await response.json()
}

export const updateSupplier = async (id: string, supplier: Partial<SupplierPayload>): Promise<Supplier> => {
  const response = await fetchWithCsrf(`${getApiUrl()}proveedores/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al actualizar proveedor"))
  }

  return await response.json()
}

export const deleteSupplier = async (id: string) => {
  const response = await fetchWithCsrf(`${getApiUrl()}proveedores/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al eliminar proveedor"))
  }

  return await response.json()
}

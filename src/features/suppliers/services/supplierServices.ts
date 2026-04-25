import { getAuthHeaders, getHeadersWithContentType } from "../../../shared/utils/apiHeaders"

const getApiUrl = () => import.meta.env.VITE_API_URL || '/api/'

export const fetchSuppliers = async (params: { page?: number, limit?: number, name?: string } = {}): Promise<any> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.name) queryParams.append('name', params.name)

  const url = `${getApiUrl()}proveedores?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener proveedores")
  }

  return await response.json()
}

export const createSupplier = async (supplier: any) => {
  const response = await fetch(`${getApiUrl()}proveedores`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear proveedor")
  }

  return await response.json()
}

export const updateSupplier = async (id: string, supplier: any) => {
  const response = await fetch(`${getApiUrl()}proveedores/${id}`, {
    method: "PATCH",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar proveedor")
  }

  return await response.json()
}

export const deleteSupplier = async (id: string) => {
  const response = await fetch(`${getApiUrl()}proveedores/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar proveedor")
  }

  return await response.json()
}

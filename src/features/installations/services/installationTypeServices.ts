import { getAuthHeaders, getHeadersWithContentType, fetchWithCsrf } from "../../../shared/utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export interface InstallationTypeResponse {
  _id: string
  nombre: string
  descripcion?: string
  activo: boolean
  fechaCreacion: string
}

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || ""

  if (!response.ok) {
    const error = contentType.includes("application/json")
      ? await response.json().catch(() => ({ message: "Error de conexión" }))
      : { message: `Error ${response.status}: el servidor no devolvió JSON` }

    throw new Error(error.message || `Error ${response.status}: ${response.statusText}`)
  }

  if (!contentType.includes("application/json")) {
    throw new Error("La API de tipos de instalación devolvió una respuesta inválida")
  }

  const result = await response.json()
  return result.success ? result.data : result
}

export const fetchInstallationTypes = async (includeInactive = false): Promise<InstallationTypeResponse[]> => {
  const response = await fetchWithCsrf(`${API_URL}tipos-instalacion?includeInactive=${includeInactive}`, {
    headers: getAuthHeaders(),
  })

  const result = await handleResponse(response)

  // El backend ya filtra por tenantId usando el token JWT
  return Array.isArray(result) ? result : []
}

export const createInstallationType = async (typeData: Record<string, unknown>): Promise<InstallationTypeResponse> => {
  const response = await fetchWithCsrf(`${API_URL}tipos-instalacion`, {
    method: "POST",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(typeData),
  })
  return handleResponse(response)
}

export const updateInstallationType = async (id: string, typeData: Record<string, unknown>): Promise<InstallationTypeResponse> => {
  const response = await fetchWithCsrf(`${API_URL}tipos-instalacion/${id}`, {
    method: "PUT",
    headers: getHeadersWithContentType(),
    body: JSON.stringify(typeData),
  })
  return handleResponse(response)
}

export const deleteInstallationType = async (id: string) => {
  const response = await fetchWithCsrf(`${API_URL}tipos-instalacion/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  return handleResponse(response)
}

export const getInstallationTypeById = async (id: string): Promise<InstallationTypeResponse> => {
  const response = await fetchWithCsrf(`${API_URL}tipos-instalacion/${id}`, {
    headers: getAuthHeaders(),
  })
  return handleResponse(response)
}

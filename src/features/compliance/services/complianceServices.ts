import {
  fetchWithAuthRetry,
  fetchWithCsrf,
  getAuthHeaders,
} from "../../../shared/utils/apiHeaders"
import type {
  Escaneo,
  Norma,
  NormaPayload,
  ObjetivoTipo,
  Regla,
  ReglaPayload,
  ResumenCumplimiento,
  ResultadoCumplimiento,
} from "./complianceTypes"

const getApiUrl = () => import.meta.env.VITE_API_URL || "/api/"

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const error = await response.json()
    return error.message || error.error?.message || error.error || fallback
  } catch {
    return `Error ${response.status}: ${response.statusText}`
  }
}

const normalizeList = <T>(result: unknown, key: string): T[] => {
  if (Array.isArray(result)) return result as T[]

  if (!result || typeof result !== "object") return []

  const response = result as Record<string, unknown>
  const candidates = [key, "data", "items"]
  for (const candidate of candidates) {
    const value = response[candidate]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

// ---- Normas ----

export const fetchNormas = async (): Promise<Norma[]> => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}normas-cumplimiento`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener normas"))
  }
  return normalizeList<Norma>(await response.json(), "normas")
}

export const createNorma = async (norma: NormaPayload): Promise<Norma> => {
  const response = await fetchWithCsrf(`${getApiUrl()}normas-cumplimiento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(norma),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al crear norma"))
  }
  return await response.json()
}

export const updateNorma = async (id: string, data: Partial<NormaPayload>): Promise<Norma> => {
  const response = await fetchWithCsrf(`${getApiUrl()}normas-cumplimiento/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al actualizar norma"))
  }
  return await response.json()
}

export const deleteNorma = async (id: string): Promise<unknown> => {
  const response = await fetchWithCsrf(`${getApiUrl()}normas-cumplimiento/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al eliminar norma"))
  }
  return await response.json()
}

// ---- Reglas ----

export const fetchReglas = async (): Promise<Regla[]> => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}reglas-cumplimiento`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener reglas"))
  }
  return normalizeList<Regla>(await response.json(), "reglas")
}

export const createRegla = async (regla: ReglaPayload): Promise<Regla> => {
  const response = await fetchWithCsrf(`${getApiUrl()}reglas-cumplimiento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(regla),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al crear regla"))
  }
  return await response.json()
}

export const updateRegla = async (id: string, data: Partial<ReglaPayload>): Promise<Regla> => {
  const response = await fetchWithCsrf(`${getApiUrl()}reglas-cumplimiento/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al actualizar regla"))
  }
  return await response.json()
}

export const deleteRegla = async (id: string): Promise<unknown> => {
  const response = await fetchWithCsrf(`${getApiUrl()}reglas-cumplimiento/${id}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al eliminar regla"))
  }
  return await response.json()
}

// ---- Escaneos ----

export const triggerEscaneo = async (): Promise<Escaneo> => {
  const response = await fetchWithCsrf(`${getApiUrl()}escaneos-cumplimiento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al iniciar el escaneo"))
  }
  return await response.json()
}

export const fetchEscaneo = async (id: string): Promise<Escaneo> => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}escaneos-cumplimiento/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al consultar el escaneo"))
  }
  return await response.json()
}

// ---- Reportes ----

export const fetchResumen = async (): Promise<ResumenCumplimiento> => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}cumplimiento/resumen`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener el resumen"))
  }
  return await response.json()
}

export const fetchObjetivo = async (
  tipo: ObjetivoTipo,
  id: string,
): Promise<ResultadoCumplimiento[]> => {
  const response = await fetchWithAuthRetry(
    `${getApiUrl()}cumplimiento/objetivos/${tipo}/${id}`,
    { headers: getAuthHeaders() },
  )
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Error al obtener el objetivo"))
  }
  return await response.json()
}
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
  CatalogAssignment, CatalogFinding, CatalogPackDetail, CatalogPackSummary, CatalogRunDetail, CatalogRunSummary, PagedResult, CatalogState,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const requireRecord = (value: unknown, message: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(message)
  return value
}
const requirePaged = <T>(value: unknown, itemGuard: (item: unknown) => item is T): PagedResult<T> => {
  const result = requireRecord(value, "Respuesta de compliance inválida")
  if (!Array.isArray(result.items) || !result.items.every(itemGuard)) {
    throw new Error("Respuesta de compliance inválida")
  }
  if (!["page", "limit", "total", "totalPages"].every((key) => typeof result[key] === "number")) {
    throw new Error("Respuesta de paginación inválida")
  }
  return result as unknown as PagedResult<T>
}
const isPackSummary = (value: unknown): value is CatalogPackSummary => {
  const item = value as CatalogPackSummary
  return isRecord(value) && typeof item.packKey === "string" && typeof item.version === "number" &&
    item.state === "published" && Array.isArray(item.controlRefs) && Array.isArray(item.evaluatorRefs) &&
    isRecord(item.rights) && item.rights.author === "Leonix" &&
    item.rights.rightsStatus === "original_operational_content"
}

const isParameterDefinition = (value: unknown) => {
  const item = value as Record<string, unknown>
  return isRecord(value) && typeof item.key === "string" &&
    ["number", "integer", "boolean", "string"].includes(String(item.type)) &&
    (item.min === undefined || typeof item.min === "number") &&
    (item.max === undefined || typeof item.max === "number") &&
    (item.allowed === undefined || Array.isArray(item.allowed))
}

const isPackDetail = (value: unknown): value is CatalogPackDetail =>
  isRecord(value) && typeof value.packKey === "string" && typeof value.version === "number" &&
  value.state === "published" && isRecord(value.rights) && value.rights.author === "Leonix" &&
  value.rights.rightsStatus === "original_operational_content" && Array.isArray(value.controls) &&
  value.controls.every((control) => isRecord(control) && Array.isArray(control.parameterDefinitions) &&
    control.parameterDefinitions.every(isParameterDefinition)) && Array.isArray(value.evaluators)
const CATALOG_STATES: CatalogState[] = ["PASS", "WARN", "FAIL", "NOT_APPLICABLE", "INSUFFICIENT_EVIDENCE", "ERROR"]
const isRunSummary = (value: unknown): value is CatalogRunSummary => { const item = value as CatalogRunSummary; return isRecord(value) && typeof item._id === "string" && item.source === "catalog" && typeof item.estado === "string" && isRecord(item.progress) && isRecord(item.counts) && CATALOG_STATES.every((state) => typeof item.counts[state] === "number") && (item.score === null || typeof item.score === "number") }
const isRunDetail = (value: unknown): value is CatalogRunDetail => { const item = value as CatalogRunDetail; return isRunSummary(value) && isRecord(item.assignment) && isRecord(item.pack) && typeof item.pack.packKey === "string" && typeof item.pack.version === "number" && Array.isArray(item.controls) && Array.isArray(item.evaluators) && isRecord(item.rights) && isRecord(item.applicability) }
const isAssignment = (value: unknown): value is CatalogAssignment => { const item = value as CatalogAssignment; return isRecord(value) && typeof item.assignmentKey === "string" && typeof item.packKey === "string" && typeof item.version === "number" && (item.status === "active" || item.status === "inactive") && typeof item.scope === "string" && isRecord(item.parameters) && Array.isArray(item.controlScopes) }
const isFinding = (value: unknown): value is CatalogFinding => { const item = value as CatalogFinding; return isRecord(value) && typeof item.id === "string" && CATALOG_STATES.includes(item.state) && (item.reason === null || typeof item.reason === "string") && typeof item.evaluatedAt === "string" && typeof item.targetId === "string" && typeof item.controlKey === "string" && typeof item.controlVersion === "number" && (item.dataHash === null || typeof item.dataHash === "string") }
const request = async <T>(path: string, guard: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> => { const response = await fetchWithAuthRetry(`${getApiUrl()}${path}`, { headers: getAuthHeaders(), signal }); if (!response.ok) throw new Error(await parseErrorMessage(response, "Error al obtener compliance")); const value: unknown = await response.json(); if (!guard(value)) throw new Error("Respuesta de compliance inválida"); return value }
const queryString = (params: Record<string, string | number | undefined>) => { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)) }); return query.toString() }
export const fetchCatalogPacks = (page = 1, limit = 10, signal?: AbortSignal) => request<PagedResult<CatalogPackSummary>>(`compliance/catalog/packs?${queryString({ page, limit })}`, (value): value is PagedResult<CatalogPackSummary> => { try { requirePaged(value, isPackSummary); return true } catch { return false } }, signal)
export const fetchCatalogPack = (packKey: string, version: number, signal?: AbortSignal) => request<CatalogPackDetail>(`compliance/catalog/packs/${encodeURIComponent(packKey)}/versions/${encodeURIComponent(version)}`, isPackDetail, signal)
export const fetchAssignments = (signal?: AbortSignal) => request<CatalogAssignment[]>("compliance/assignments", (value): value is CatalogAssignment[] => Array.isArray(value) && value.every(isAssignment), signal)

export const createAssignment = async (
  payload: { assignmentKey: string; packKey: string; version: number; parameters: Record<string, unknown> },
  signal?: AbortSignal,
) => {
  const response = await fetchWithCsrf(`${getApiUrl()}compliance/assignments`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), signal,
  })
  if (!response.ok) throw new Error(await parseErrorMessage(response, "Error al guardar la asignación"))
  const value: unknown = await response.json()
  if (!isAssignment(value)) throw new Error("Respuesta de asignación inválida")
  return value
}

export const startCatalogRun = async (assignmentKey?: string, signal?: AbortSignal): Promise<Escaneo> => { const response = await fetchWithCsrf(`${getApiUrl()}escaneos-cumplimiento`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignmentKey ? { assignmentKey } : {}), signal }); if (!response.ok) throw new Error(await parseErrorMessage(response, "Error al iniciar la evaluación")); return await response.json() as Escaneo }
export const fetchCatalogRuns = (page = 1, limit = 10, signal?: AbortSignal) => request<PagedResult<CatalogRunSummary>>(`compliance/catalog/runs?${queryString({ page, limit })}`, (value): value is PagedResult<CatalogRunSummary> => { try { requirePaged(value, isRunSummary); return true } catch { return false } }, signal)
export const fetchCatalogRun = (id: string, signal?: AbortSignal) => request<CatalogRunDetail>(`compliance/catalog/runs/${encodeURIComponent(id)}`, isRunDetail, signal)
export const fetchCatalogFindings = (id: string, page = 1, limit = 10, state?: CatalogState, targetType?: "asset" | "installation", signal?: AbortSignal) => request<PagedResult<CatalogFinding>>(`compliance/catalog/runs/${encodeURIComponent(id)}/findings?${queryString({ page, limit, state, targetType })}`, (value): value is PagedResult<CatalogFinding> => { try { requirePaged(value, isFinding); return true } catch { return false } }, signal)

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

export const fetchEscaneo = async (id: string, signal?: AbortSignal): Promise<Escaneo> => {
  const response = await fetchWithAuthRetry(`${getApiUrl()}escaneos-cumplimiento/${id}`, {
    headers: getAuthHeaders(),
    signal,
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

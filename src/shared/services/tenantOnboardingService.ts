import { getAuthHeaders, getHeadersWithContentType, fetchWithCsrf } from "../utils/apiHeaders"

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export type TenantOnboardingState = "incomplete" | "complete"

export type OnboardingCheckKey =
  | "company"
  | "installationTypes"
  | "deviceCategories"
  | "formCategories"
  | "maintenanceTemplate"

export interface TenantOnboardingChecks {
  company: boolean
  installationTypes: boolean
  deviceCategories: boolean
  formCategories: boolean
  maintenanceTemplate: boolean
}

export interface TenantOnboardingStatus {
  status: TenantOnboardingState
  version: number
  completedAt: string | null
  checks: TenantOnboardingChecks
  missing: string[]
}

interface CompleteConflictBody {
  success: false
  error: {
    code: string
    message?: string
    missing?: string[]
    checks?: Partial<Record<string, boolean>> | null
  }
}

/**
 * Error lanzado cuando el servidor rechaza el cierre del onboarding (409).
 * Conserva la lista `missing` del servidor para mostrarla tal cual.
 */
export class TenantOnboardingError extends Error {
  readonly code: string
  readonly status: number
  readonly missing: string[]
  readonly checks: Partial<Record<string, boolean>> | null

  constructor(message: string, options: { code: string; status: number; missing?: string[]; checks?: Partial<Record<string, boolean>> | null }) {
    super(message)
    this.name = "TenantOnboardingError"
    this.code = options.code
    this.status = options.status
    this.missing = options.missing ?? []
    this.checks = options.checks ?? null
  }
}

const parseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    throw new Error(`Error ${response.status}: el servidor no devolvió JSON`)
  }
  return response.json().catch(() => {
    throw new Error("Error al leer la respuesta del servidor")
  })
}

/**
 * Obtiene el estado del onboarding del tenant actual.
 * El servidor es la única fuente de verdad: no se usa localStorage.
 */
export const fetchTenantOnboardingStatus = async (): Promise<TenantOnboardingStatus> => {
  const response = await fetchWithCsrf(`${API_URL}tenant/onboarding`, {
    headers: getAuthHeaders(),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    const body = data as { error?: { message?: string } }
    throw new Error(body?.error?.message || `Error ${response.status}: no se pudo obtener el estado de configuración`)
  }

  return data as TenantOnboardingStatus
}

/**
 * Marca el onboarding como completo. El servidor valida los requisitos
 * reales y responde 409 con la lista `missing` si falta algo (sin mutar).
 */
export const completeTenantOnboarding = async (): Promise<TenantOnboardingStatus> => {
  const response = await fetchWithCsrf(`${API_URL}tenant/onboarding/complete`, {
    method: "POST",
    headers: getHeadersWithContentType("POST"),
    body: JSON.stringify({}),
  })

  const data = await parseJson(response)

  if (!response.ok) {
    const body = data as CompleteConflictBody | { error?: { message?: string } }
    const nested = (body as CompleteConflictBody)?.error
    throw new TenantOnboardingError(
      nested?.message || (body as { error?: { message?: string } })?.error?.message || "No se pudo completar la configuración inicial",
      {
        code: nested?.code || "ONBOARDING_COMPLETE_FAILED",
        status: response.status,
        missing: nested?.missing ?? [],
        checks: nested?.checks ?? null,
      },
    )
  }

  return data as TenantOnboardingStatus
}

/**
 * Detecta el 403 ONBOARDING_INCOMPLETE que devuelven las rutas operativas
 * cuando el tenant aún no completó la configuración inicial.
 */
export const isOnboardingIncompleteError = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false
  const record = payload as { error?: { code?: string }; code?: string }
  return record?.error?.code === "ONBOARDING_INCOMPLETE" || record?.code === "ONBOARDING_INCOMPLETE"
}

/**
 * Guía en español para mostrar cuando una llamada operativa es rechazada
 * por configuración incompleta. Función pura: no toca localStorage.
 */
export const getOnboardingIncompleteGuidance = (missing: string[] = []): string => {
  const detail = missing.length > 0 ? ` Faltan: ${missing.join(", ")}.` : ""
  return `Tu cuenta aún no completó la configuración inicial obligatoria.${detail} Completá el asistente de configuración para acceder a esta sección.`
}

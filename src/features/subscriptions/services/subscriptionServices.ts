import { useAuthStore } from '../../../store/authStore'
import { fetchWithAuthRetry, getHeadersWithContentType, getAuthHeaders } from '../../../shared/utils/apiHeaders'
import type { PageQuery, ServerPage } from '../../../shared/types/pagination'
import type { InstallationResponse } from '../../installations/services/installationServices'

const API_URL = import.meta.env.VITE_API_URL || "/api/"

export interface SubscriptionQuery extends PageQuery {
  maintenanceStatus?: string
  maintenanceMonth?: string
}

export interface SubscriptionStatusCounts {
  all: number
  active: number
  inactive: number
  pending: number
}

export interface SubscriptionPage extends ServerPage<InstallationResponse> {
  statusCounts: SubscriptionStatusCounts
}

// Plan pages are independent of the full, owner-scoped installation cache.
export const fetchSubscriptionPage = async (query: SubscriptionQuery, options?: { signal?: AbortSignal }): Promise<SubscriptionPage> => {
  const params = new URLSearchParams({ maintenancePlan: 'true', page: String(query.page), limit: String(query.limit), search: query.search })
  if (query.maintenanceStatus) params.set('maintenanceStatus', query.maintenanceStatus)
  if (query.maintenanceMonth) params.set('maintenanceMonth', query.maintenanceMonth)
  const baseUrl = API_URL.endsWith('/') ? API_URL : `${API_URL}/`
  const response = await fetchWithAuthRetry(`${baseUrl}installations?${params}`, {
    headers: getAuthHeaders(), signal: options?.signal,
  })
  if (!response.ok) throw new Error('Error al obtener instalaciones')
  return response.json()
}

export const updateSubscription = async (subscriptionId: string, updateData: Record<string, any>) => {
  // Obtener el token del store
  const isAuthenticated = useAuthStore.getState().isAuthenticated
  if (!isAuthenticated) {
    throw new Error('Token de autorización requerido')
  }

  // IMPORTANTE: Enviar solo los campos requeridos por validateSubscriptionUpdate
  // Los campos de técnicos se envían con tolerancia: si el backend usa validación
  // estricta los ignora, y si ya soporta asignación quedan persistidos.
  const technicianIds = Array.isArray(updateData.technicianIds)
    ? updateData.technicianIds
    : Array.isArray(updateData.tecnicosAsignados)
      ? updateData.tecnicosAsignados
      : Array.isArray(updateData.tecnicosIds)
        ? updateData.tecnicosIds
        : undefined
  const updatePayload: Record<string, unknown> = {
    fechaInicio: updateData.fechaInicio,
    fechaFin: updateData.fechaFin,
    frecuencia: updateData.frecuencia?.trim(),
    mesesFrecuencia: updateData.mesesFrecuencia,
    estado: updateData.estado,
    // La nueva API no espera generacionAutomatica en este endpoint, pero si es necesario se envía
  }
  if (technicianIds !== undefined) {
    updatePayload.technicianIds = technicianIds
    updatePayload.tecnicosAsignados = technicianIds
    updatePayload.tecnicosIds = technicianIds
  }

  // Asegurarse de que la URL esté bien formada
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  // Usar la nueva ruta PATCH de subscription
  const url = `${baseUrl}/installations/${subscriptionId}/subscription`

  const response = await fetchWithAuthRetry(url, {
    method: "PATCH",
    headers: getHeadersWithContentType('PATCH'),
    body: JSON.stringify(updatePayload),
  })

  const data = await response.json()

  if (!response.ok) {
    // Si hay un mensaje de error específico del servidor, usarlo
    // El servidor de validación de Yup suele emitir data.error (array) o data.message
    const errorMsg = data.error ? JSON.stringify(data.error) : data.message
    throw new Error(errorMsg || "Error al actualizar suscripción")
  }

  return data
}

export const triggerAutomaticWorkOrdersGeneration = async () => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated
  if (!isAuthenticated) {
    throw new Error('Token de autorización requerido')
  }

  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
  const endpoints = [
    `${baseUrl}/preventivo/ejecutar`,
    `${baseUrl}/ordenes-trabajo/generar-desde-abonos`,
    `${baseUrl}/ordenes-trabajo/generar-automaticas`,
    `${baseUrl}/subscriptions/generate-work-orders`,
  ]

  let lastError: Error | null = null
  for (const url of endpoints) {
    let response: Response
    try {
      response = await fetchWithAuthRetry(url, {
        method: "POST",
        headers: getHeadersWithContentType('POST'),
      })
    } catch (error: unknown) {
      // Fallo de red/transporte: reintentar otra ruta no lo resuelve; no ocultar el problema.
      throw (error as Error) ?? new Error('No se pudo generar órdenes automáticas')
    }
    if (response.ok) {
      return await response.json()
    }
    // S8: contrato único por operación. Solo se prueba la siguiente ruta cuando
    // la actual no existe (404/405 = ruta no implementada en el backend).
    // Cualquier otro estado (400/401/403/500/…) es un error con significado:
    // se informa de inmediato sin enmascararlo con más intentos.
    // Ruta oficial pendiente de confirmación del backend (ver odd/tasks/auditoria-leonix-fase1.md T2).
    if (response.status === 404 || response.status === 405) {
      lastError = new Error(`Error ${response.status}: ${response.statusText}`)
      continue
    }
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  throw lastError || new Error('No se pudo generar órdenes automáticas')
}

import { getHeadersWithContentType, fetchWithCsrf } from '../../../shared/utils/apiHeaders'
import {
  recordTechnicianIncident,
  getPendingIncidentsFromStorage,
  savePendingIncidentsToStorage,
} from '../../../shared/offline/technicianIncident'
import type { CreateIncidentData, IncidentReportResponse } from '../types/incidents.types'

const API_URL = import.meta.env.VITE_API_URL || '/api/'

const normalizeUrl = (path: string): string => {
  const base = API_URL.endsWith('/') ? API_URL : `${API_URL}/`
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleanPath}`
}

const handleResponse = async (response: Response): Promise<IncidentReportResponse> => {
  if (!response.ok) {
    let error: { message?: string; error?: string; code?: string; details?: string[] } = {}
    try {
      error = await response.json()
    } catch {
      error = { message: 'Error de conexión con el servidor' }
    }

    let errorMsg = error.message || error.error || error.code || `Error ${response.status}: ${response.statusText}`
    if (Array.isArray(error.details) && error.details.length > 0) {
      errorMsg = `${errorMsg}: ${error.details.join(', ')}`
    }

    throw new Error(errorMsg)
  }

  return response.json()
}

class IncidentService {
  private endpoint = normalizeUrl('incidencias')

  private async recordOfflineFallback(data: CreateIncidentData, commandId: string): Promise<IncidentReportResponse> {
    const offlineResult = await recordTechnicianIncident(data, commandId)
    if (offlineResult.error && offlineResult.error !== 'INSTALLATION_NOT_PREPARED') {
      throw new Error(`Error al registrar en modo sin conexión: ${offlineResult.error}`)
    }

    return {
      success: true,
      message: 'Incidencia guardada localmente. Se sincronizará automáticamente al restablecer la conexión.',
      data: {
        _id: commandId,
        titulo: data.titulo || `Incidencia: ${data.tipoIncidencia}`,
        estado: 'solicitada',
        origen: 'reporte_tecnico',
      },
    }
  }

  async reportIncident(data: CreateIncidentData): Promise<IncidentReportResponse> {
    const commandId = crypto.randomUUID()

    if (!navigator.onLine) {
      return this.recordOfflineFallback(data, commandId)
    }

    try {
      const response = await fetchWithCsrf(this.endpoint, {
        method: 'POST',
        headers: {
          ...getHeadersWithContentType(),
          'X-Idempotency-Key': commandId,
        },
        body: JSON.stringify({ ...data, clientRequestId: commandId }),
      })

      return await handleResponse(response)
    } catch (error) {
      // Si falla por problemas de red/conectividad (TypeError en fetch), encolar offline
      if (error instanceof TypeError) {
        return this.recordOfflineFallback(data, commandId)
      }
      throw error
    }
  }

  async syncPendingIncidents(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) return { synced: 0, failed: 0 }

    const pending = getPendingIncidentsFromStorage()
    if (!pending.length) return { synced: 0, failed: 0 }

    const remaining: typeof pending = []
    let synced = 0
    let failed = 0

    for (const item of pending) {
      try {
        const response = await fetchWithCsrf(this.endpoint, {
          method: 'POST',
          headers: {
            ...getHeadersWithContentType(),
            'X-Idempotency-Key': item.commandId,
          },
          body: JSON.stringify(item),
        })

        if (response.ok) {
          synced++
        } else {
          remaining.push(item)
          failed++
        }
      } catch {
        remaining.push(item)
        failed++
      }
    }

    savePendingIncidentsToStorage(remaining)
    return { synced, failed }
  }
}

export const incidentService = new IncidentService()

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { incidentService } from '../../../../src/features/incidents/services/incidentServices'
import type { CreateIncidentData } from '../../../../src/features/incidents/types/incidents.types'

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getHeadersWithContentType: () => ({ 'Content-Type': 'application/json' }),
  fetchWithCsrf: vi.fn(),
}))

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      tenantId: 'tenant-123',
      userId: 'user-456',
      role: 'tecnico',
    }),
  },
}))

vi.mock('../../../../src/store/offlineTrustStore', () => ({
  useOfflineTrustStore: {
    getState: () => ({
      deviceId: 'device-789',
      isOfflineReady: false,
    }),
  },
}))

describe('IncidentService', () => {
  const samplePayload: CreateIncidentData = {
    instalacionId: 'inst-1',
    dispositivoId: 'dev-1',
    tipoIncidencia: 'falla_detectada',
    prioridadSugerida: 'alta',
    descripcion: 'Falla en sensor de temperatura con sobrecalentamiento.',
    fotos: ['data:image/jpeg;base64,samplephoto'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    })
  })

  it('envía reporte online al backend correctamente', async () => {
    const { fetchWithCsrf } = await import('../../../../src/shared/utils/apiHeaders')
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        message: 'Incidencia reportada exitosamente',
        data: { _id: 'incident-999', estado: 'solicitada', origen: 'reporte_tecnico' },
      }),
    }
    vi.mocked(fetchWithCsrf).mockResolvedValue(mockResponse as unknown as Response)

    const result = await incidentService.reportIncident(samplePayload)

    expect(result.success).toBe(true)
    expect(result.message).toContain('exitosa')
    expect(fetchWithCsrf).toHaveBeenCalledTimes(1)
  })

  it('guarda en cola local cuando está sin conexión (offline)', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
      writable: true,
    })

    const result = await incidentService.reportIncident(samplePayload)

    expect(result.success).toBe(true)
    expect(result.message).toContain('localmente')
    const saved = JSON.parse(localStorage.getItem('offline_pending_incidents') || '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0].dispositivoId).toBe('dev-1')
    expect(saved[0].prioridadSugerida).toBe('alta')
  })

  it('sincroniza incidentes locales pendientes cuando vuelve la conexión', async () => {
    const { fetchWithCsrf } = await import('../../../../src/shared/utils/apiHeaders')
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true }),
    }
    vi.mocked(fetchWithCsrf).mockResolvedValue(mockResponse as unknown as Response)

    // Cargar 2 incidentes en cola
    localStorage.setItem(
      'offline_pending_incidents',
      JSON.stringify([
        { ...samplePayload, commandId: 'cmd-1', createdAt: new Date().toISOString() },
        { ...samplePayload, commandId: 'cmd-2', createdAt: new Date().toISOString() },
      ]),
    )

    const syncResult = await incidentService.syncPendingIncidents()

    expect(syncResult.synced).toBe(2)
    expect(syncResult.failed).toBe(0)
    expect(JSON.parse(localStorage.getItem('offline_pending_incidents') || '[]')).toHaveLength(0)
  })
})

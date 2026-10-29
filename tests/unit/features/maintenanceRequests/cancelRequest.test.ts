import { describe, it, expect, vi, beforeEach } from 'vitest'
import { maintenanceRequestsService } from '../../../../src/features/maintenanceRequests/services/maintenanceRequestsService'

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getHeadersWithContentType: () => ({ 'Content-Type': 'application/json' }),
  getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
  fetchWithAuthRetry: vi.fn(),
  fetchWithCsrf: vi.fn(),
}))

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: true }),
  },
}))

describe('cancelRequest ruta única (S4+S8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('avanza a la segunda ruta solo si la primera no existe (404)', async () => {
    const { fetchWithCsrf } = await import('../../../../src/shared/utils/apiHeaders')
    vi.mocked(fetchWithCsrf)
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK', json: async () => ({ message: 'Cancelada' }) } as unknown as Response)

    const result = await maintenanceRequestsService.cancelRequest('req-1')
    expect(result.message).toBe('Cancelada')
    expect(fetchWithCsrf).toHaveBeenCalledTimes(2)
  })

  it('no expone el 404 crudo cuando ninguna ruta de cancelación existe (S4)', async () => {
    const { fetchWithCsrf } = await import('../../../../src/shared/utils/apiHeaders')
    vi.mocked(fetchWithCsrf).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as unknown as Response)

    await expect(maintenanceRequestsService.cancelRequest('req-1')).rejects.toThrow(/administrador/i)
  })

  it('crea la solicitud solo con fechaPreferida, sin fechaProgramada (S5)', async () => {
    const { fetchWithCsrf } = await import('../../../../src/shared/utils/apiHeaders')
    vi.mocked(fetchWithCsrf).mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => ({ message: 'ok', workOrder: {} }) } as unknown as Response)

    await maintenanceRequestsService.createRequest({
      titulo: 'Ruido en caldera',
      descripcion: 'Ruido anómalo en la caldera del sector norte.',
      instalacionId: 'inst-1',
      prioridad: 'media',
      tipoProblema: 'falla_equipo',
      fechaPreferida: '2026-11-05',
      contactoNombre: 'Cliente',
      contactoTelefono: '123',
      contactoEmail: 'c@example.com',
    })

    const body = JSON.parse((vi.mocked(fetchWithCsrf).mock.calls[0][1] as { body: string }).body)
    expect(body.fechaPreferida).toBe('2026-11-05')
    expect(body).not.toHaveProperty('fechaProgramada')
  })
})

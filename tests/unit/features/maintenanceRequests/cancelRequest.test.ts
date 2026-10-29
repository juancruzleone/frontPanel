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
})

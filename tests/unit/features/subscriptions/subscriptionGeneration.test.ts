import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerAutomaticWorkOrdersGeneration } from '../../../../src/features/subscriptions/services/subscriptionServices'

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getHeadersWithContentType: () => ({ 'Content-Type': 'application/json' }),
  getAuthHeaders: () => ({ Authorization: 'Bearer test' }),
  fetchWithAuthRetry: vi.fn(),
}))

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: true }),
  },
}))

describe('triggerAutomaticWorkOrdersGeneration (S8 contrato único)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no oculta errores con significado probando otras rutas (500 corta el fallback)', async () => {
    const { fetchWithAuthRetry } = await import('../../../../src/shared/utils/apiHeaders')
    vi.mocked(fetchWithAuthRetry).mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' } as unknown as Response)

    await expect(triggerAutomaticWorkOrdersGeneration()).rejects.toThrow()
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(1)
  })

  it('avanza a la siguiente ruta solo cuando la anterior no existe (404)', async () => {
    const { fetchWithAuthRetry } = await import('../../../../src/shared/utils/apiHeaders')
    vi.mocked(fetchWithAuthRetry)
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as unknown as Response)

    const result = await triggerAutomaticWorkOrdersGeneration()
    expect(result).toEqual({ success: true })
    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(2)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auditService } from '../../../../src/features/audit/services/auditService'

describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    // @ts-expect-error - Mocking import.meta.env
    import.meta.env.VITE_API_URL = 'https://api.test/api/'
  })

  it('envía cookies de sesión al obtener registros de auditoría', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ logs: [], total: 0, page: 1, limit: 50 }),
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await auditService.getLogs()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/audit-logs'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    )
  })

  it('mantiene el fallback cuando el backend devuelve 404', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(auditService.getLogs()).rejects.toThrow('BACKEND_NOT_IMPLEMENTED')
  })
})

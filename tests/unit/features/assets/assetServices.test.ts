import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAssets, fetchTemplates } from '../../../../src/features/assets/services/assetServices'

describe('assetServices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    // @ts-expect-error - Mocking import.meta.env
    import.meta.env.VITE_API_URL = 'https://api.test/api/'
  })

  it('envía cookies y filtros al obtener activos', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ assets: [], total: 0, totalPages: 1 }),
    })

    await fetchAssets({ page: 2, limit: 4, search: 'bomba', category: 'Equipos' })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/activos?'),
      expect.objectContaining({
        credentials: 'include',
      })
    )

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('limit=4')
    expect(String(url)).toContain('search=bomba')
    expect(String(url)).toContain('category=Equipos')
  })

  it('envía cookies al obtener plantillas de activos', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    })

    await fetchTemplates({ page: 1, limit: 100 })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/plantillas?'),
      expect.objectContaining({
        credentials: 'include',
      })
    )
  })
})

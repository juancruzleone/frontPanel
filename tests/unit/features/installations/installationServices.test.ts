import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchInstallations } from '../../../../src/features/installations/services/installationServices'

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ role: 'admin' }),
  },
}))

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  getAuthHeaders: () => ({}),
  getHeadersWithContentType: () => ({}),
  fetchWithCsrf: (url: string, options: RequestInit) => fetch(url, options),
}))

describe('installationServices', () => {
  beforeEach(() => {
    import.meta.env.VITE_API_URL = '/api/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [], pagination: {} }),
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('serializes search and installation type filters', async () => {
    await fetchInstallations({ page: 2, limit: 4, search: 'north wing', category: 'Hospital' })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('page=2')
    expect(String(url)).toContain('limit=4')
    expect(String(url)).toContain('search=north+wing')
    expect(String(url)).toContain('category=Hospital')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getApiHeaders, getHeadersWithCsrf, fetchWithCsrf } from '../../../src/shared/utils/apiHeaders'
import { useAuthStore } from '../../../src/store/authStore'
import { useCSRFStore } from '../../../src/store/csrfStore'

// Mock auth store
vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}))

// Mock CSRF store
vi.mock('../../../src/store/csrfStore', () => ({
  useCSRFStore: {
    getState: vi.fn(),
  },
}))

describe('apiHeaders - CSRF Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Reset stores
    useAuthStore.getState.mockReturnValue({
      user: 'testuser',
      userId: 'user123',
      token: 'test-auth-token',
      role: 'admin',
      tenantId: 'tenant123',
      permissions: { read: true, write: true },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setAuthenticated: vi.fn(),
      setTenantId: vi.fn(),
      setLogoutMessage: vi.fn(),
    })

    useCSRFStore.getState.mockReturnValue({
      token: 'test-csrf-token',
      isLoading: false,
      error: null,
      fetchToken: vi.fn(),
      clearToken: vi.fn(),
    })
  })

  describe('getApiHeaders', () => {
    it('should NOT include CSRF token for GET requests', () => {
      const headers = getApiHeaders(false, 'GET')

      expect(headers['X-CSRF-Token']).toBeUndefined()
    })

    it('should NOT include CSRF token for OPTIONS requests', () => {
      const headers = getApiHeaders(false, 'OPTIONS')

      expect(headers['X-CSRF-Token']).toBeUndefined()
    })

    it('should include CSRF token for POST requests', () => {
      const headers = getApiHeaders(false, 'POST')

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
    })

    it('should include CSRF token for PUT requests', () => {
      const headers = getApiHeaders(false, 'PUT')

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
    })

    it('should include CSRF token for DELETE requests', () => {
      const headers = getApiHeaders(false, 'DELETE')

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
    })

    it('should include CSRF token for PATCH requests', () => {
      const headers = getApiHeaders(false, 'PATCH')

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
    })

    it('should handle lowercase method names', () => {
      const headersPost = getApiHeaders(false, 'post')
      const headersPut = getApiHeaders(false, 'put')

      expect(headersPost['X-CSRF-Token']).toBe('test-csrf-token')
      expect(headersPut['X-CSRF-Token']).toBe('test-csrf-token')
    })

    it('should not include CSRF token when CSRF store has no token', () => {
      useCSRFStore.getState.mockReturnValue({
        token: null,
        isLoading: false,
        error: null,
        fetchToken: vi.fn(),
        clearToken: vi.fn(),
      })

      const headers = getApiHeaders(false, 'POST')

      expect(headers['X-CSRF-Token']).toBeUndefined()
    })

    it('should include Authorization header', () => {
      const headers = getApiHeaders(false, 'GET')

      expect(headers['Authorization']).toBe('Bearer test-auth-token')
    })

    it('should include X-Tenant-ID header', () => {
      const headers = getApiHeaders(false, 'GET')

      expect(headers['X-Tenant-ID']).toBe('tenant123')
    })

    it('should include Content-Type when requested', () => {
      const headers = getApiHeaders(true, 'GET')

      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('getHeadersWithCsrf', () => {
    it('should return headers with CSRF token and Content-Type by default', () => {
      const headers = getHeadersWithCsrf()

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should allow excluding Content-Type', () => {
      const headers = getHeadersWithCsrf(false)

      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
      expect(headers['Content-Type']).toBeUndefined()
    })
  })

  describe('fetchWithCsrf - 403 Retry Logic', () => {
    it('should return response directly if not 403', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const response = await fetchWithCsrf('/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      })

      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry once on 403 and succeed', async () => {
      const mock403Response = { ok: false, status: 403 }
      const mock200Response = { ok: true, status: 200 }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mock403Response)
        .mockResolvedValueOnce(mock200Response)

      const fetchTokenMock = vi.fn().mockResolvedValue(undefined)
      useCSRFStore.getState.mockReturnValue({
        token: 'new-csrf-token',
        isLoading: false,
        error: null,
        fetchToken: fetchTokenMock,
        clearToken: vi.fn(),
      })

      const response = await fetchWithCsrf('/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      })

      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(fetchTokenMock).toHaveBeenCalled()
    })

    it('should throw error if token refresh fails on 403', async () => {
      const mock403Response = { ok: false, status: 403 }
      
      global.fetch = vi.fn().mockResolvedValue(mock403Response)

      const fetchTokenMock = vi.fn().mockRejectedValue(new Error('Token refresh failed'))
      useCSRFStore.getState.mockReturnValue({
        token: 'old-csrf-token',
        isLoading: false,
        error: null,
        fetchToken: fetchTokenMock,
        clearToken: vi.fn(),
      })

      await expect(fetchWithCsrf('/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      })).rejects.toThrow('Token refresh failed')
    })

    it('should NOT add CSRF header for GET requests in fetchWithCsrf', async () => {
      const mockResponse = { ok: true, status: 200 }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      await fetchWithCsrf('/api/data', {
        method: 'GET',
      })

      const call = vi.mocked(global.fetch).mock.calls[0]
      const headers = call[1]?.headers as Record<string, string> || {}
      expect(headers['X-CSRF-Token']).toBeUndefined()
    })

    it('should add CSRF header for POST requests in fetchWithCsrf', async () => {
      const mockResponse = { ok: true, status: 200 }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      await fetchWithCsrf('/api/data', {
        method: 'POST',
        body: JSON.stringify({ test: true }),
      })

      const call = vi.mocked(global.fetch).mock.calls[0]
      const headers = call[1]?.headers as Record<string, string> || {}
      expect(headers['X-CSRF-Token']).toBe('test-csrf-token')
    })
  })
})

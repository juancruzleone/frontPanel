import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchWithAuthRetry, isAuthError } from '../../../src/shared/utils/apiHeaders'
import { refreshSession } from '../../../src/shared/services/authRefreshService'
import { useCSRFStore } from '../../../src/store/csrfStore'

// Mock authRefreshService
vi.mock('../../../src/shared/services/authRefreshService', () => ({
  refreshSession: vi.fn(),
}))

// Mock CSRF store
vi.mock('../../../src/store/csrfStore', () => ({
  useCSRFStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}))

describe('apiHeaders - isAuthError', () => {
  it('should return true for 401 status', () => {
    expect(isAuthError({ status: 401 })).toBe(true)
  })

  it('should not treat a generic 403 as an auth error', () => {
    expect(isAuthError({ status: 403 })).toBe(false)
  })

  it('should return true for TOKEN_EXPIRED message', () => {
    expect(isAuthError({ code: 'TOKEN_EXPIRED' })).toBe(true)
  })

  it('should return true for REFRESH_TOKEN_EXPIRED message', () => {
    expect(isAuthError({ error: { code: 'REFRESH_TOKEN_EXPIRED' } })).toBe(true)
  })

  it('should return false for generic errors', () => {
    expect(isAuthError(new Error('Network error'))).toBe(false)
    expect(isAuthError(null)).toBe(false)
  })
})

describe('apiHeaders - Auth Retry Logic', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    
    useCSRFStore.getState.mockReturnValue({
      token: 'test-csrf-token',
      fetchToken: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('should retry a single request when it fails with 401 TOKEN_EXPIRED', async () => {
    const mock401Response = {
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'TOKEN_EXPIRED' } }),
      clone: function() { return this },
    }
    const mock200Response = {
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      clone: function() { return this },
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mock401Response)
      .mockResolvedValueOnce(mock200Response)

    refreshSession.mockResolvedValue({ csrfToken: 'new-csrf-token' })

    const response = await fetchWithAuthRetry('/api/data', { method: 'GET' })

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('should not retry if the error is 401 but not TOKEN_EXPIRED', async () => {
    const mock401Response = {
      ok: false,
      status: 401,
      json: async () => ({ message: 'UNAUTHORIZED' }),
      clone: function() { return this },
    }

    global.fetch = vi.fn().mockResolvedValue(mock401Response)

    const response = await fetchWithAuthRetry('/api/data', { method: 'GET' })

    expect(response.status).toBe(401)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('should throw if refreshSession fails', async () => {
    const mock401Response = {
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'TOKEN_EXPIRED' } }),
      clone: function() { return this },
    }

    global.fetch = vi.fn().mockResolvedValue(mock401Response)
    refreshSession.mockRejectedValue(new Error('Refresh failed'))

    await expect(fetchWithAuthRetry('/api/data', { method: 'GET' }))
      .rejects.toThrow('Refresh failed')
    
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })
})

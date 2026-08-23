import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWithAuthRetry, getApiHeaders } from '../../src/shared/utils/apiHeaders'
import { useCSRFStore } from '../../src/store/csrfStore'

describe('frontend CSRF boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCSRFStore.setState({ token: 'csrf-test-token', isLoading: false, error: null })
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('adds the current CSRF token to %s requests', (method) => {
    expect(getApiHeaders(true, method)).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'csrf-test-token',
      'X-Requested-With': 'XMLHttpRequest',
    }))
  })

  it('does not add a CSRF token to safe GET requests', () => {
    expect(getApiHeaders(false, 'GET')).toEqual({
      'X-Requested-With': 'XMLHttpRequest',
    })
  })

  it('sends authenticated mutations with cookie credentials and repository headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    await fetchWithAuthRetry('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: true }),
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/data', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'csrf-test-token',
        'X-Requested-With': 'XMLHttpRequest',
      }),
    }))
  })
})

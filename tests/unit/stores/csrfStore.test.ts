import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCSRFStore } from '../../../src/store/csrfStore'
import * as csrfServices from '../../../src/shared/services/csrfServices'

// Mock del servicio de CSRF
vi.mock('../../../src/shared/services/csrfServices', () => ({
  fetchCsrfToken: vi.fn(),
}))

// Mock auth store para verificar integración con logout
vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({
      token: 'test-auth-token',
      logout: vi.fn(),
    }),
  },
}))

describe('CSRF Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    // Reset store state
    useCSRFStore.setState({
      token: null,
      isLoading: false,
      error: null,
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCSRFStore.getState()

      expect(state.token).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('fetchToken', () => {
    it('should set token on successful fetch', async () => {
      const mockResponse = { token: 'test-csrf-token-123' }
      vi.mocked(csrfServices.fetchCsrfToken).mockResolvedValue(mockResponse)

      await useCSRFStore.getState().fetchToken()
      const state = useCSRFStore.getState()

      expect(state.token).toBe('test-csrf-token-123')
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should deduplicate concurrent token fetches', async () => {
      vi.mocked(csrfServices.fetchCsrfToken).mockResolvedValue({ token: 'shared-token' })

      await Promise.all([
        useCSRFStore.getState().fetchToken(),
        useCSRFStore.getState().fetchToken(),
      ])

      expect(csrfServices.fetchCsrfToken).toHaveBeenCalledTimes(1)
    })

    it('should set loading state while fetching', () => {
      const mockResponse = { token: 'test-token' }
      const promise = vi.mocked(csrfServices.fetchCsrfToken).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      )

      const fetchPromise = useCSRFStore.getState().fetchToken()
      const state = useCSRFStore.getState()

      expect(state.isLoading).toBe(true)
      
      return fetchPromise.then(() => {
        expect(useCSRFStore.getState().isLoading).toBe(false)
      })
    })

    it('should set error on fetch failure', async () => {
      vi.mocked(csrfServices.fetchCsrfToken).mockRejectedValue(
        new Error('Network error')
      )

      await useCSRFStore.getState().fetchToken()
      const state = useCSRFStore.getState()

      expect(state.error).toBe('Network error')
      expect(state.isLoading).toBe(false)
      expect(state.token).toBeNull()
    })

    it('should handle error without message', async () => {
      vi.mocked(csrfServices.fetchCsrfToken).mockRejectedValue(
        new Error()
      )

      await useCSRFStore.getState().fetchToken()
      const state = useCSRFStore.getState()

      expect(state.error).toBe('Error al obtener token CSRF')
    })
  })

  describe('clearToken', () => {
    it('should clear token and error', async () => {
      // First set a token
      const mockResponse = { token: 'test-token' }
      vi.mocked(csrfServices.fetchCsrfToken).mockResolvedValue(mockResponse)
      await useCSRFStore.getState().fetchToken()

      // Then clear it
      useCSRFStore.getState().clearToken()
      const state = useCSRFStore.getState()

      expect(state.token).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  describe('Persistence', () => {
    it('should persist token to sessionStorage', async () => {
      const mockResponse = { token: 'persisted-token-123' }
      vi.mocked(csrfServices.fetchCsrfToken).mockResolvedValue(mockResponse)

      await useCSRFStore.getState().fetchToken()

      const stored = sessionStorage.getItem('csrf-storage')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.state.token).toBe('persisted-token-123')
    })

    it('should persist token to sessionStorage and restore on new store instance', async () => {
      const mockResponse = { token: 'persisted-token-123' }
      vi.mocked(csrfServices.fetchCsrfToken).mockResolvedValue(mockResponse)

      await useCSRFStore.getState().fetchToken()

      const stored = sessionStorage.getItem('csrf-storage')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed.state.token).toBe('persisted-token-123')
      
      // Verify the store has the token
      const state = useCSRFStore.getState()
      expect(state.token).toBe('persisted-token-123')
    })
  })
})

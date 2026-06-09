import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { AppInitializer } from '../../src/AppProviders'
import { useAuthStore } from '../../src/store/authStore'
import { useCSRFStore } from '../../src/store/csrfStore'
import { verifySession } from '../../src/features/auth/services/loginServices'
import React from 'react'

// Mock dependencies
vi.mock('../../src/features/auth/services/loginServices')
vi.mock('../../src/store/authStore')
vi.mock('../../src/store/csrfStore')
vi.mock('../../src/shared/components/OfflineSyncManager', () => ({
  OfflineSyncManager: () => <div data-testid="offline-sync-manager" />
}))
vi.mock('../../src/shared/hooks/useTheme', () => ({
  useTheme: () => ({ dark: false })
}))

describe('AppInitializer', () => {
  const hydrateSession = vi.fn()
  const setAuthResolved = vi.fn()
  const fetchToken = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock stores
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      setAuthResolved,
      userId: 'user-123'
    }))
    
    vi.mocked(useAuthStore.getState).mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true
    })

    vi.mocked(useCSRFStore).mockImplementation((selector) => selector({
      fetchToken,
      token: null,
      isLoading: false
    }))

    vi.stubGlobal('navigator', { onLine: true })
  })

  it('should call verifySession on mount', async () => {
    vi.mocked(verifySession).mockResolvedValue({ user: { id: '1' } })

    render(<AppInitializer><div>Test</div></AppInitializer>)

    expect(verifySession).toHaveBeenCalled()
  })

  it('should trigger session refresh when coming back online', async () => {
    vi.mocked(verifySession).mockResolvedValue({ user: { id: '1' } })
    
    render(<AppInitializer><div>Test</div></AppInitializer>)
    
    // Clear initial call
    vi.mocked(verifySession).mockClear()

    // Simulate online event
    window.dispatchEvent(new Event('online'))

    // Should call verifySession again
    expect(verifySession).toHaveBeenCalled()
  })
})

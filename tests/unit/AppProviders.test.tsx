import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AppInitializer } from '../../src/AppProviders'
import { useAuthStore } from '../../src/store/authStore'
import { useCSRFStore } from '../../src/store/csrfStore'
import { verifySession } from '../../src/features/auth/services/loginServices'
import React from 'react'
import { clearCheckoutIntentId, getBillingStatus, promoteBillingSession } from '../../src/features/billing/services/billingService'
import { initializeOfflineTrust } from '../../src/shared/offline/trustInit'
import { ApiError } from '../../src/shared/services/ApiError'

// Mock dependencies
vi.mock('../../src/features/auth/services/loginServices')
vi.mock('../../src/store/authStore')
vi.mock('../../src/store/csrfStore')
vi.mock('../../src/features/billing/services/billingService')
vi.mock('../../src/shared/offline/trustInit')
vi.mock('../../src/shared/offline/roleBootstrap')
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
  const logout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock stores
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      isAuthResolved: true,
      accessMode: 'full',
      setBillingContext: vi.fn(),
      setAuthResolved,
      logout,
      userId: 'user-123'
    }))
    
    vi.mocked(useAuthStore.getState).mockReturnValue({
      userId: 'user-123',
      isAuthenticated: true,
      accessMode: 'full',
    })

    vi.mocked(useCSRFStore).mockImplementation((selector) => selector({
      fetchToken,
      token: null,
      isLoading: false,
      error: null
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

    await waitFor(() => expect(verifySession).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    // Clear initial call
    vi.mocked(verifySession).mockClear()

    // Simulate online event
    window.dispatchEvent(new Event('online'))

    // Should call verifySession again
    await waitFor(() => expect(verifySession).toHaveBeenCalled())
  })

  it('does not immediately retry CSRF bootstrap while a failure is actionable', async () => {
    vi.mocked(verifySession).mockResolvedValue({ user: { id: '1' } })
    vi.mocked(useCSRFStore).mockImplementation((selector) => selector({
      fetchToken,
      token: null,
      isLoading: false,
      error: 'Network error',
    }))

    render(<AppInitializer><div>Test</div></AppInitializer>)
    await waitFor(() => expect(verifySession).toHaveBeenCalled())

    expect(fetchToken).not.toHaveBeenCalled()
  })

  it('keeps a verified admin session when optional billing metadata fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ user: { _id: 'admin-1', role: 'admin' } })
    vi.mocked(getBillingStatus).mockRejectedValue(new Error('Billing unavailable'))

    render(<AppInitializer><div>Test</div></AppInitializer>)

    await waitFor(() => expect(hydrateSession).toHaveBeenCalled())
    expect(useAuthStore.setState).toHaveBeenCalledWith({ isAuthenticated: false, isAuthResolved: false })
    expect(useAuthStore.setState).not.toHaveBeenCalledWith(expect.objectContaining({ isAuthResolved: true }))
  })

  it('restores billing capability without verifying or warming normal app services', async () => {
    const setBillingContext = vi.fn()
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      isAuthResolved: true,
      accessMode: 'billing_only',
      setBillingContext,
      logout,
    }))
    vi.mocked(useAuthStore.getState).mockReturnValue({
      userId: null,
      isAuthenticated: false,
      accessMode: 'billing_only',
    })
    vi.mocked(getBillingStatus).mockResolvedValue({
      accessMode: 'billing_only',
      tenant: { tenantId: 'tenant-1', name: 'Acme', plan: 'professional', status: 'active' },
      trial: { status: 'expired', plan: 'professional', startsAt: '2026-08-01', endsAt: '2026-08-31' },
      subscription: null,
      availablePlans: [],
    })

    render(<AppInitializer><div>Test</div></AppInitializer>)

    await waitFor(() => expect(setBillingContext).toHaveBeenCalled())
    expect(verifySession).not.toHaveBeenCalled()
    expect(initializeOfflineTrust).not.toHaveBeenCalled()
    expect(screen.queryByTestId('offline-sync-manager')).not.toBeInTheDocument()
  })

  it('clears an invalid persisted billing capability so login remains reachable', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      isAuthResolved: false,
      accessMode: 'billing_only',
      setBillingContext: vi.fn(),
      logout,
    }))
    vi.mocked(useAuthStore.getState).mockReturnValue({ userId: null, isAuthenticated: false, accessMode: 'billing_only' })
    vi.mocked(getBillingStatus).mockRejectedValue(new ApiError(403, { error: { code: 'BILLING_CAPABILITY_EXPIRED' } }, 'Expired'))

    render(<AppInitializer><div>Login</div></AppInitializer>)

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(verifySession).not.toHaveBeenCalled()
  })

  it('preserves billing-only state after a recoverable network failure', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      isAuthResolved: false,
      accessMode: 'billing_only',
      setBillingContext: vi.fn(),
      logout,
    }))
    vi.mocked(useAuthStore.getState).mockReturnValue({ userId: null, isAuthenticated: false, accessMode: 'billing_only' })
    vi.mocked(getBillingStatus).mockRejectedValue(new TypeError('Failed to fetch'))

    render(<AppInitializer><div>Billing</div></AppInitializer>)

    await waitFor(() => expect(useAuthStore.setState).toHaveBeenCalledWith({
      isAuthenticated: false,
      isAuthResolved: true,
      accessMode: 'billing_only',
    }))
    expect(logout).not.toHaveBeenCalled()
  })

  it('promotes once, clears the checkout intent, and hydrates atomically before entering full access', async () => {
    const setBillingContext = vi.fn()
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession,
      isAuthenticated: false,
      isAuthResolved: false,
      accessMode: 'billing_only',
      setBillingContext,
      logout,
    }))
    vi.mocked(useAuthStore.getState).mockReturnValue({ userId: null, isAuthenticated: false, accessMode: 'billing_only' })
    vi.mocked(getBillingStatus).mockResolvedValue({
      accessMode: 'full',
      tenant: { tenantId: 'tenant-1', name: 'Acme', plan: 'professional', status: 'active' },
      trial: null,
      subscription: null,
      availablePlans: [],
    })
    vi.mocked(promoteBillingSession).mockResolvedValue({
      authenticated: true,
      accessMode: 'full',
      user: { _id: 'admin-1', role: 'admin', tenantId: 'tenant-1' },
    })

    render(<AppInitializer><div>Billing</div></AppInitializer>)

    await waitFor(() => expect(hydrateSession).toHaveBeenCalledTimes(1))
    expect(promoteBillingSession).toHaveBeenCalledTimes(1)
    expect(promoteBillingSession).toHaveBeenCalledBefore(hydrateSession)
    expect(clearCheckoutIntentId).toHaveBeenCalledTimes(1)
    expect(clearCheckoutIntentId).toHaveBeenCalledBefore(hydrateSession)
    expect(setBillingContext).not.toHaveBeenCalled()
  })
})

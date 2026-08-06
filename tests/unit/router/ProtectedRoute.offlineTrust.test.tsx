/**
 * R2 — ProtectedRoute offline trust gating: signed-lease authority over
 * editable localStorage roles, reload behavior, and locked routes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import ProtectedRoute from '../../../src/router/ProtectedRoute'
import { useAuthStore } from '../../../src/store/authStore'
import { useOfflineTrustStore } from '../../../src/store/offlineTrustStore'
import type { OfflineLeaseClaim } from '../../../src/shared/offline/crypto'

vi.mock('../../../src/router/useTranslatedRoutes', () => ({
  useTranslatedRoutes: () => ({ getRoute: (key: string) => `/${key}`, navigateToRoute: vi.fn() }),
}))

const CLAIM: OfflineLeaseClaim = {
  schemaVersion: 1, tenantId: 'tenant-A', userId: 'user-1', deviceId: 'device-1', role: 'tecnico',
  permissions: ['offline:read'], issuedAt: 'x', lastVerifiedAt: 'x',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}
const setAuth = (o: Record<string, unknown> = {}) => useAuthStore.setState({ user: 't1', userId: 'user-1', tenantId: 'tenant-A', role: 'tecnico', isAuthenticated: true, isAuthResolved: true, ...o })
const setTrust = (status: string, resolved = true, claim: OfflineLeaseClaim | null = null) => useOfflineTrustStore.setState({ status, resolved, claim })
function renderProtected(allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/protegida']}>
      <ProtectedRoute allowedRoles={allowedRoles}><div data-testid="content">protegido</div></ProtectedRoute>
    </MemoryRouter>
  )
}

describe('ProtectedRoute offline trust gating', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, userId: null, tenantId: null, role: null, permissions: null, isAuthenticated: false, isAuthResolved: false })
    useOfflineTrustStore.setState({ status: 'pending', resolved: false, claim: null, deviceId: null })
    vi.spyOn(useOfflineTrustStore.getState(), 'reconcile').mockResolvedValue(undefined)
  })
  it('unlocks offline with a valid signed lease whose claim role matches', () => {
    setTrust('valid', true, CLAIM); setAuth()
    renderProtected(['tecnico'])
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
  it('locks offline when the signed claim role does not match the allowed roles', () => {
    setTrust('valid', true, CLAIM); setAuth()
    renderProtected(['admin'])
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
  it('locks offline when a forged localStorage role contradicts the signed claim', () => {
    setTrust('valid', true, CLAIM); setAuth({ role: 'admin' }) // forged editable role
    renderProtected(['admin'])
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
  it('locks offline when the lease is expired even with a forged admin role', () => {
    setTrust('lease-expired', true, CLAIM); setAuth({ role: 'admin' })
    renderProtected(['admin'])
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
  it('uses the authenticated server response as authority when online', () => {
    setTrust('online-authenticated'); setAuth({ role: 'admin' })
    renderProtected(['admin'])
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
  it('renders nothing while pending, then unlocks after reload resolution', () => {
    setTrust('pending', false); setAuth()
    const { rerender } = renderProtected(['tecnico'])
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    setTrust('valid', true, CLAIM)
    rerender(
      <MemoryRouter initialEntries={['/protegida']}>
        <ProtectedRoute allowedRoles={['tecnico']}><div data-testid="content">protegido</div></ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
  it('keeps existing behavior: unauthenticated users are redirected', () => {
    setTrust('online-authenticated')
    renderProtected(['tecnico'])
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })
})
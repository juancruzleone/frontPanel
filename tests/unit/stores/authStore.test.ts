import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../../src/store/authStore'

describe('AuthStore', () => {
  beforeEach(async () => {
    // Reset store before each test
    await useAuthStore.getState().logout()
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()
      
      expect(state.user).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.token).toBeNull()
      expect(state.role).toBeNull()
      expect(state.tenantId).toBeNull()
      expect(state.permissions).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.logoutMessage).toBeNull()
    })
  })

  describe('Login', () => {
    it('should set user data on login with user object', () => {
      const loginData = {
        user: {
          _id: 'user123',
          userName: 'testuser',
          role: 'admin',
          tenantId: 'tenant123',
          permissions: { read: true, write: true }
        },
        token: 'test-token-123'
      }

      useAuthStore.getState().login(loginData)
      const state = useAuthStore.getState()

      expect(state.user).toBe('testuser')
      expect(state.userId).toBe('user123')
      expect(state.token).toBeNull() // Token should not be stored
      expect(state.role).toBe('admin')
      expect(state.tenantId).toBe('tenant123')
      expect(state.permissions).toEqual({ read: true, write: true })
      expect(state.isAuthenticated).toBe(false) // Not authenticated until modal is closed
    })

    it('should set user data on login with cuenta object', () => {
      const loginData = {
        cuenta: {
          _id: 'user456',
          username: 'testuser2',
          role: 'user',
          tenantId: 'tenant456',
          permissions: { read: true }
        },
        token: 'test-token-456'
      }

      useAuthStore.getState().login(loginData)
      const state = useAuthStore.getState()

      expect(state.user).toBe('testuser2')
      expect(state.userId).toBe('user456')
      expect(state.token).toBeNull()
      expect(state.role).toBe('user')
      expect(state.tenantId).toBe('tenant456')
    })

    it('should handle login with missing optional fields', () => {
      const loginData = {
        user: {
          _id: 'user789'
        },
        token: 'test-token-789'
      }

      useAuthStore.getState().login(loginData)
      const state = useAuthStore.getState()

      expect(state.userId).toBe('user789')
      expect(state.token).toBeNull()
      expect(state.user).toBe('user789') // Falls back to _id
      expect(state.role).toBeNull()
      expect(state.tenantId).toBeNull()
    })

    it('should not set data if user/cuenta is missing', () => {
      const loginData = {
        token: 'test-token-invalid'
      }

      useAuthStore.getState().login(loginData as any)
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
    })
  })

  describe('setAuthenticated', () => {
    it('should set isAuthenticated to true', () => {
      useAuthStore.getState().setAuthenticated(true)
      
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    it('should set isAuthenticated to false', () => {
      useAuthStore.getState().setAuthenticated(true)
      useAuthStore.getState().setAuthenticated(false)
      
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  describe('setLogoutMessage', () => {
    it('should set logout message', () => {
      const message = 'Session expired'
      useAuthStore.getState().setLogoutMessage(message)
      
      expect(useAuthStore.getState().logoutMessage).toBe(message)
    })

    it('should clear logout message', () => {
      useAuthStore.getState().setLogoutMessage('Test message')
      useAuthStore.getState().setLogoutMessage(null)
      
      expect(useAuthStore.getState().logoutMessage).toBeNull()
    })
  })

  describe('setTenantId', () => {
    it('should set tenantId', () => {
      const tenantId = 'tenant-new-123'
      useAuthStore.getState().setTenantId(tenantId)
      
      expect(useAuthStore.getState().tenantId).toBe(tenantId)
    })

    it('should update existing tenantId', () => {
      useAuthStore.getState().setTenantId('tenant-old')
      useAuthStore.getState().setTenantId('tenant-new')
      
      expect(useAuthStore.getState().tenantId).toBe('tenant-new')
    })
  })

  describe('Logout', () => {
    it('should clear all auth data on logout', async () => {
      // First login
      const loginData = {
        user: {
          _id: 'user123',
          userName: 'testuser',
          role: 'admin',
          tenantId: 'tenant123',
          permissions: { read: true }
        },
        token: 'test-token-123'
      }

      useAuthStore.getState().login(loginData)
      useAuthStore.getState().setAuthenticated(true)

      // Then logout
      await useAuthStore.getState().logout()
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.userId).toBeNull()
      expect(state.token).toBeNull()
      expect(state.role).toBeNull()
      expect(state.tenantId).toBeNull()
      expect(state.permissions).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('persists billing-only capability without authenticating the normal app', () => {
      useAuthStore.getState().enterBillingOnly({
        accessMode: 'billing_only',
        trial: { status: 'expired', plan: 'professional', startsAt: '2026-08-01', endsAt: '2026-08-31' },
        billingSession: { expiresAt: '2026-08-31T14:00:00Z' },
      })

      const state = useAuthStore.getState()
      const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      expect(state).toMatchObject({ accessMode: 'billing_only', isAuthenticated: false, billingSessionExpiresAt: '2026-08-31T14:00:00Z' })
      expect(persisted.state.accessMode).toBe('billing_only')
      expect(persisted.state.trial.plan).toBe('professional')
    })

    it('promotes billing-only state to full authenticated access', () => {
      useAuthStore.getState().enterBillingOnly({ accessMode: 'billing_only' })
      useAuthStore.getState().hydrateSession({
        authenticated: true,
        accessMode: 'full',
        user: { _id: 'admin-1', userName: 'admin', role: 'admin', tenantId: 'tenant-1' },
      })

      expect(useAuthStore.getState()).toMatchObject({ accessMode: 'full', isAuthenticated: true, userId: 'admin-1' })
    })

    it('does not enter full access from billing status before session promotion', () => {
      useAuthStore.getState().enterBillingOnly({ accessMode: 'billing_only' })
      useAuthStore.getState().setBillingContext({
        accessMode: 'full',
        tenant: { tenantId: 'tenant-1', name: 'Acme', plan: 'professional', status: 'active' },
        trial: null,
      })

      expect(useAuthStore.getState()).toMatchObject({ accessMode: 'billing_only', isAuthenticated: false })
    })

    it('should persist auth data to localStorage', () => {
      const loginData = {
        user: {
          _id: 'user123',
          userName: 'testuser',
          role: 'admin'
        },
        token: 'test-token-123'
      }

      useAuthStore.getState().login(loginData)

      const stored = localStorage.getItem('auth-storage')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.state.user).toBe('testuser')
      expect(parsed.state).not.toHaveProperty('token')
      expect(parsed.state).not.toHaveProperty('isAuthenticated')
      expect(parsed.state).not.toHaveProperty('isAuthResolved')
    })

    it('should clear localStorage on logout', async () => {
      const loginData = {
        user: {
          _id: 'user123',
          userName: 'testuser'
        },
        token: 'test-token-123'
      }

      useAuthStore.getState().login(loginData)
      await useAuthStore.getState().logout()

      const stored = localStorage.getItem('auth-storage')
      const parsed = JSON.parse(stored!)
      
      expect(parsed.state.user).toBeNull()
      expect(parsed.state).not.toHaveProperty('token')
    })
  })

  describe('Complete Auth Flow', () => {
    it('should handle complete authentication flow', async () => {
      // 1. Initial state
      let state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)

      // 2. Login
      const loginData = {
        user: {
          _id: 'user123',
          userName: 'testuser',
          role: 'admin',
          tenantId: 'tenant123'
        },
        token: 'test-token-123'
      }
      useAuthStore.getState().login(loginData)
      
      state = useAuthStore.getState()
      expect(state.user).toBe('testuser')
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false) // Still false until modal closed

      // 3. Set authenticated (modal closed)
      useAuthStore.getState().setAuthenticated(true)
      
      state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)

      // 4. Logout
      await useAuthStore.getState().logout()
      
      state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })
  })
})

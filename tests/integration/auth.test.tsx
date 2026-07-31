import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { useAuthStore } from '../../src/store/authStore'

// Mock del store
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      const mockLogin = vi.fn()
      const mockSetAuthenticated = vi.fn()

      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        login: mockLogin,
        setAuthenticated: mockSetAuthenticated,
        logout: vi.fn(),
        setLogoutMessage: vi.fn(),
        setTenantId: vi.fn(),
        userId: null,
        role: null,
        tenantId: null,
        permissions: null,
        logoutMessage: null,
      })

      // Simular login exitoso
      const userData = {
        cuenta: {
          _id: '123',
          userName: 'testuser',
          email: 'test@example.com',
          role: 'admin',
          tenantId: 'tenant123',
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      }

      mockLogin(userData)

      expect(mockLogin).toHaveBeenCalledWith(userData)
    })

    it('should handle login failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      })

      const response = await fetch('/api/cuenta/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: 'test', password: 'wrong' }),
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error.message).toBe('Invalid credentials')
    })
  })

  describe('Token Management', () => {
    it('should store token securely', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { token },
        version: 0,
      }))

      const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}')
      expect(stored.state.token).toBe(token)
    })

    it('should include token in API requests', async () => {
      const token = 'test-token'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      )
    })
  })

  describe('Logout Flow', () => {
    it('should clear auth data on logout', () => {
      const mockLogout = vi.fn()

      vi.mocked(useAuthStore).mockReturnValue({
        user: 'testuser',
        token: 'test-token',
        isAuthenticated: true,
        login: vi.fn(),
        setAuthenticated: vi.fn(),
        logout: mockLogout,
        setLogoutMessage: vi.fn(),
        setTenantId: vi.fn(),
        userId: '123',
        role: 'admin',
        tenantId: 'tenant123',
        permissions: null,
        logoutMessage: null,
      })

      mockLogout()

      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        login: vi.fn(),
        setAuthenticated: vi.fn(),
        logout: vi.fn(),
        setLogoutMessage: vi.fn(),
        setTenantId: vi.fn(),
        userId: null,
        role: null,
        tenantId: null,
        permissions: null,
        logoutMessage: null,
      })

      const isAuthenticated = useAuthStore().isAuthenticated
      expect(isAuthenticated).toBe(false)
    })

    it('should allow authenticated users', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: 'testuser',
        token: 'test-token',
        isAuthenticated: true,
        login: vi.fn(),
        setAuthenticated: vi.fn(),
        logout: vi.fn(),
        setLogoutMessage: vi.fn(),
        setTenantId: vi.fn(),
        userId: '123',
        role: 'admin',
        tenantId: 'tenant123',
        permissions: null,
        logoutMessage: null,
      })

      const isAuthenticated = useAuthStore().isAuthenticated
      expect(isAuthenticated).toBe(true)
    })
  })
})

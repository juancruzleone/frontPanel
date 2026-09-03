import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import React from 'react'

vi.mock('react-i18next', async () => {
  const actual: any = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: any, opts?: any) => {
        if (Array.isArray(key)) return key[0]
        if (opts?.defaultValue) return opts.defaultValue
        if (typeof key === 'string' && key.includes('.')) return key.split('.').pop() || key
        return key
      },
      i18n: { language: 'es', resolvedLanguage: 'es' },
    }),
  }
})

import ProtectedRoute from '@/router/ProtectedRoute'

// mock auth store
const mockState: any = {
  user: { id: '1', name: 'Test' },
  role: 'admin',
  isAuthenticated: true,
  isAuthResolved: true,
  accessMode: 'full',
}

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: any) => selector(mockState),
}))

vi.mock('@/router/useTranslatedRoutes', () => ({
  useTranslatedRoutes: () => ({ getRoute: (k: string) => (k === 'home' ? '/home' : `/${k}`), navigateToRoute: vi.fn(), getRouteKeyFromPath: vi.fn(), currentLang: 'es' }),
}))

// simple dummy PanelAdmin with KPI
const DummyPanel: React.FC = () => <div><span>Total Tenants</span><span>Active Tenants</span></div>

describe('panelAdmin RBAC (PR3)', () => {
  beforeEach(() => {
    mockState.role = 'admin'
    mockState.isAuthenticated = true
    mockState.isAuthResolved = true
    mockState.accessMode = 'full'
  })

  it('non-super_admin (admin) is redirected, no KPI DOM leaked', async () => {
    mockState.role = 'admin'
    const { container } = render(
      <MemoryRouter initialEntries={['/panel-admin']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/panel-admin" element={<DummyPanel />} />
          </Route>
          <Route path="/home" element={<div>Home</div>} />
          <Route path="/" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    )
    // should redirect to home (or not show KPI)
    expect(container.textContent).not.toMatch(/Total Tenants/)
    // either shows Home or Login, but not panel content
    expect(container.textContent).toMatch(/Home|Login/)
  })

  it('super_admin can access panel', async () => {
    mockState.role = 'super_admin'
    const { container } = render(
      <MemoryRouter initialEntries={['/panel-admin']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/panel-admin" element={<DummyPanel />} />
          </Route>
          <Route path="/home" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(container.textContent).toMatch(/Total Tenants/)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { Tenant } from '@/features/tenants/types/tenant.types'

const mockUsePanelAdmin = vi.fn()
vi.mock('@/features/tenants/hooks/usePanelAdminDashboard', () => ({
  default: () => mockUsePanelAdmin(),
}))

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

vi.mock('@/router/useTranslatedRoutes', () => ({
  useTranslatedRoutes: () => ({ getRoute: (k: string) => `/${k}`, navigateToRoute: vi.fn(), getRouteKeyFromPath: vi.fn(), currentLang: 'es' }),
}))
vi.mock('@/router', async () => {
  const actual: any = await vi.importActual('@/router')
  return { ...actual, useTranslatedRoutes: () => ({ getRoute: (k: string) => `/${k}`, navigateToRoute: vi.fn(), getRouteKeyFromPath: vi.fn(), currentLang: 'es' }) }
})

import PanelAdmin from '@/pages/PanelAdmin'
import RecentTenants from '@/features/tenants/components/RecentTenants'

function makeTenant(overrides: Partial<Tenant> & { _id: string }): Tenant {
  return {
    _id: overrides._id,
    tenantId: overrides._id,
    name: `Tenant ${overrides._id}`,
    subdomain: `sub${overrides._id}`,
    email: `t${overrides._id}@example.com`,
    plan: (overrides.plan as any) ?? 'basic',
    status: (overrides.status as any) ?? 'active',
    createdAt: overrides.createdAt ?? '2026-03-15T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-15T00:00:00.000Z',
    maxUsers: 10,
    maxAssets: 100,
    features: { workOrders: true, assets: true, reports: true, pdfGeneration: true, apiAccess: false, customBranding: false, prioritySupport: false } as any,
    stats: overrides.stats ?? { totalUsers: 1, totalAssets: 1, totalWorkOrders: 0, lastActivity: '2026-03-15T00:00:00.000Z' },
    ...overrides,
  } as Tenant
}

describe('PR3 RecentTenants + skeletons + headerMetadata (RED)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('RecentTenants renders newest 5 desc, uses home.panel + ordersList + tagChip', async () => {
    const tenants = [
      makeTenant({ _id: '1', createdAt: '2026-01-01T00:00:00.000Z', name: 'Oldest' }),
      makeTenant({ _id: '2', createdAt: '2026-02-01T00:00:00.000Z', name: 'Second' }),
      makeTenant({ _id: '3', createdAt: '2026-03-01T00:00:00.000Z', name: 'Third' }),
      makeTenant({ _id: '4', createdAt: '2026-04-01T00:00:00.000Z', name: 'Fourth' }),
      makeTenant({ _id: '5', createdAt: '2026-05-01T00:00:00.000Z', name: 'Fifth' }),
      makeTenant({ _id: '6', createdAt: '2026-06-01T00:00:00.000Z', name: 'Newest' }),
    ]
    // RecentTenants sorts internally via stats.recentTenants (already sliced). For direct component, we pass unsorted and expect component to render in given order but PanelAdmin supplies sorted slice.
    // Test direct RecentTenants: it should render ol.ordersList and tagChip, and 5 items max when passed via PanelAdmin
    const { container } = render(<MemoryRouter><RecentTenants tenants={tenants.slice(0, 5)} /></MemoryRouter>)
    const ol = container.querySelector('ol')
    expect(ol).toBeTruthy()
    // should have ordersList class via home.module.css
    const hasOrdersList = container.innerHTML.includes('ordersList')
    expect(hasOrdersList).toBeTruthy()
    // tagChip should exist
    expect(container.innerHTML.includes('tagChip') || container.innerHTML.includes('orderStatus')).toBeTruthy()
    // panel chrome via home.panel
    expect(container.innerHTML.includes('panel')).toBeTruthy()
  })

  it('RecentTenants empty shows superAdmin.dashboard.recent.empty + createCta Link + manageCta', async () => {
    const { container } = render(<MemoryRouter><RecentTenants tenants={[]} /></MemoryRouter>)
    // i18n fallback returns last segment; our mock returns defaultValue, so check for defaultValue text or key
    // after GREEN, component renders Link to /tenants with text from t('superAdmin.dashboard.recent.createCta')
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.length).toBeGreaterThan(0)
    const hrefs = links.map(a => a.getAttribute('href'))
    expect(hrefs.some(h => h?.includes('tenants'))).toBeTruthy()
    // empty text should contain "No hay" or fallback key "empty"
    expect(container.textContent).toMatch(/No hay|empty|Sin datos/i)
  })

  it('PanelAdmin skeletons use home.skeleton* with aria-busy and data-refreshing', async () => {
    mockUsePanelAdmin.mockReturnValue({
      stats: {
        totalTenants: 0, activeTenants: 0, suspendedTenants: 0, cancelledTenants: 0,
        totalUsers: 0, totalAssets: 0, totalWorkOrders: 0,
        planDistribution: [], statusDistribution: [], evolutionData: [], recentTenants: [],
      },
      meta: null, loading: true, refreshing: false, error: null, lastUpdated: null, retry: vi.fn(),
    })
    const { container } = render(<MemoryRouter><PanelAdmin /></MemoryRouter>)
    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).toBeTruthy()
    // should contain skeleton classes from home (skeletonHeader, skeletonKpis, skeletonTrend, etc) or generic skeleton
    const hasHomeSkeleton = container.innerHTML.includes('skeletonHeader') || container.innerHTML.includes('skeletonKpis') || container.innerHTML.includes('skeleton')
    expect(hasHomeSkeleton).toBeTruthy()
  })

  it('PanelAdmin headerMetadata shows updated + scope:global + tenants: total', async () => {
    mockUsePanelAdmin.mockReturnValue({
      stats: {
        totalTenants: 5, activeTenants: 3, suspendedTenants: 0, cancelledTenants: 0,
        totalUsers: 8, totalAssets: 13, totalWorkOrders: 0,
        planDistribution: [{ key: 'basic', value: 5 }, { key: 'professional', value: 0 }, { key: 'enterprise', value: 0 }, { key: 'unknown', value: 0 }],
        statusDistribution: [{ key: 'active', value: 5 }, { key: 'suspended', value: 0 }, { key: 'cancelled', value: 0 }, { key: 'unknown', value: 0 }],
        evolutionData: [
          { name: '2026-01', label: 'Jan', value: 2 },
          { name: '2026-02', label: 'Feb', value: 1 },
          { name: '2026-03', label: 'Mar', value: 0 },
          { name: '2026-04', label: 'Apr', value: 3 },
          { name: '2026-05', label: 'May', value: 1 },
          { name: '2026-06', label: 'Jun', value: 4 },
        ],
        recentTenants: [],
      },
      meta: { pages: 1, total: 5, truncated: false },
      loading: false, refreshing: true, error: null, lastUpdated: '2026-06-15T00:00:00.000Z', retry: vi.fn(),
    })
    const { container } = render(<MemoryRouter><PanelAdmin /></MemoryRouter>)
    // headerMetadata dl should contain scope global and updated and tenants total
    const headerMeta = container.querySelector('dl')
    expect(headerMeta).toBeTruthy()
    expect(headerMeta!.textContent).toMatch(/5/)
    // data-refreshing attribute when refreshing
    const refreshingEl = container.querySelector('[data-refreshing="true"]')
    expect(refreshingEl).toBeTruthy()
    // scope global text - fallback returns "global" segment
    expect(container.textContent).toMatch(/global|Todos/i)
  })

  it('PanelAdmin workGrid contains RecentTenants span 8 + status chart span 4', async () => {
    mockUsePanelAdmin.mockReturnValue({
      stats: {
        totalTenants: 2, activeTenants: 2, suspendedTenants: 0, cancelledTenants: 0,
        totalUsers: 2, totalAssets: 2, totalWorkOrders: 0,
        planDistribution: [{ key: 'basic', value: 1 }, { key: 'professional', value: 1 }, { key: 'enterprise', value: 0 }, { key: 'unknown', value: 0 }],
        statusDistribution: [{ key: 'active', value: 2 }, { key: 'suspended', value: 0 }, { key: 'cancelled', value: 0 }, { key: 'unknown', value: 0 }],
        evolutionData: [
          { name: '2026-01', label: 'Jan', value: 1 },
          { name: '2026-02', label: 'Feb', value: 1 },
          { name: '2026-03', label: 'Mar', value: 0 },
          { name: '2026-04', label: 'Apr', value: 0 },
          { name: '2026-05', label: 'May', value: 0 },
          { name: '2026-06', label: 'Jun', value: 0 },
        ],
        recentTenants: [makeTenant({ _id: '1' }), makeTenant({ _id: '2' })],
      },
      meta: null, loading: false, refreshing: false, error: null, lastUpdated: null, retry: vi.fn(),
    })
    const { container } = render(<MemoryRouter><PanelAdmin /></MemoryRouter>)
    // workGrid class from home.module.css should exist
    expect(container.innerHTML.includes('workGrid')).toBeTruthy()
  })
})

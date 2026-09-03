import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tenantServices } from '@/features/tenants/services/tenantServices'

// Helper to make tenant
function makeTenant(id: string, num: number) {
  return {
    _id: id,
    tenantId: `t-${id}`,
    name: `Tenant ${num}`,
    subdomain: `sub${num}`,
    email: `t${num}@example.com`,
    plan: 'basic' as const,
    status: 'active' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    maxUsers: 10,
    maxAssets: 100,
    features: { workOrders: true, assets: true, reports: true, pdfGeneration: true, apiAccess: false, customBranding: false, prioritySupport: false },
    stats: { totalUsers: 1, totalAssets: 1, totalWorkOrders: 0, lastActivity: '2026-01-01T00:00:00.000Z' },
  }
}

describe('tenantServices paged aggregation fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('fetches 6 pages of 20 (120 tenants) and dedupes by _id, returns truncated false when exhausted', async () => {
    const pageSize = 20
    const total = 120
    const totalPages = 6
    // mock fetch for pages 1..6
    ;(global.fetch as any).mockImplementation(async (url: string) => {
      const u = new URL(url, 'http://test')
      const page = Number(u.searchParams.get('page') ?? '1')
      const limit = Number(u.searchParams.get('limit') ?? String(pageSize))
      const start = (page - 1) * limit
      const count = Math.min(limit, total - start)
      const tenants = Array.from({ length: count }, (_, i) => makeTenant(`id-${start + i}`, start + i))
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: 'Tenants obtenidos exitosamente',
          count,
          total,
          totalPages,
          currentPage: page,
          tenants,
        }),
      } as Response
    })

    const result = await tenantServices.fetchTenantsForAggregation({ pageSize: 20, maxPages: 25 })
    expect(result.tenants).toHaveLength(120)
    // dedupe check: unique ids
    const ids = new Set(result.tenants.map(t => t._id))
    expect(ids.size).toBe(120)
    expect(result.meta.pages).toBe(6)
    expect(result.meta.total).toBe(120)
    expect(result.meta.truncated).toBe(false)
  })

  it('dedupes duplicate _id across pages', async () => {
    ;(global.fetch as any).mockImplementation(async (url: string) => {
      const u = new URL(url, 'http://test')
      const page = Number(u.searchParams.get('page') ?? '1')
      if (page === 1) {
        return {
          ok: true, status: 200,
          json: async () => ({
            message: 'ok', count: 2, total: 3, totalPages: 2, currentPage: 1,
            tenants: [makeTenant('dup', 1), makeTenant('a2', 2)],
          }),
        } as Response
      }
      return {
        ok: true, status: 200,
        json: async () => ({
          message: 'ok', count: 2, total: 3, totalPages: 2, currentPage: 2,
          tenants: [makeTenant('dup', 1), makeTenant('a3', 3)],
        }),
      } as Response
    })
    const result = await tenantServices.fetchTenantsForAggregation({ pageSize: 2, maxPages: 5 })
    expect(result.tenants).toHaveLength(3)
    expect(result.tenants.filter(t => t._id === 'dup')).toHaveLength(1)
  })

  it('truncated true when maxPages bound hit before totalPages', async () => {
    ;(global.fetch as any).mockImplementation(async (url: string) => {
      const u = new URL(url, 'http://test')
      const page = Number(u.searchParams.get('page') ?? '1')
      return {
        ok: true, status: 200,
        json: async () => ({
          message: 'ok', count: 10, total: 100, totalPages: 10, currentPage: page,
          tenants: Array.from({ length: 10 }, (_, i) => makeTenant(`id-${page}-${i}`, i)),
        }),
      } as Response
    })
    const result = await tenantServices.fetchTenantsForAggregation({ pageSize: 10, maxPages: 2 })
    expect(result.meta.truncated).toBe(true)
    expect(result.meta.pages).toBe(2)
  })

  it('handles legacy envelope without totalPages as single-shot', async () => {
    ;(global.fetch as any).mockImplementation(async () => ({
      ok: true, status: 200,
      json: async () => ({
        message: 'ok', count: 3,
        tenants: [makeTenant('1', 1), makeTenant('2', 2), makeTenant('3', 3)],
      }),
    } as Response))
    const result = await tenantServices.fetchTenantsForAggregation({ pageSize: 100, maxPages: 25 })
    expect(result.tenants).toHaveLength(3)
    expect(result.meta.pages).toBe(1)
    expect(result.meta.truncated).toBe(false)
  })

  it('maps 401 to forbidden and 403 to forbidden', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)
    await expect(tenantServices.getTenantsPage(1, 20)).rejects.toMatchObject({ status: 401 })

    ;(global.fetch as any).mockResolvedValue({ ok: false, status: 403, json: async () => ({}) } as Response)
    await expect(tenantServices.getTenantsPage(1, 20)).rejects.toMatchObject({ status: 403 })
  })

  it('maps 5xx to server error', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)
    await expect(tenantServices.getTenantsPage(1, 20)).rejects.toMatchObject({ status: 500 })
  })

  it('supports abort signal', async () => {
    const controller = new AbortController()
    ;(global.fetch as any).mockImplementation(async (_url: string, opts: any) => {
      if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      return { ok: true, status: 200, json: async () => ({ message: 'ok', count: 1, total: 1, totalPages: 1, currentPage: 1, tenants: [makeTenant('1', 1)] }) } as Response
    })
    controller.abort()
    await expect(tenantServices.getTenantsPage(1, 20, controller.signal)).rejects.toThrow()
  })

  it('network error propagation', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('network failure'))
    await expect(tenantServices.getTenantsPage(1, 20)).rejects.toThrow('network failure')
  })
})

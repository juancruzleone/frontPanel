import { describe, it, expect } from 'vitest'
import { aggregateTenantStats, buildEvolution, toDistribution, formatCount, EMPTY_AGGREGATE } from '@/features/tenants/utils/tenantStats'
import type { Tenant } from '@/features/tenants/types/tenant.types'

function makeTenant(overrides: Partial<Tenant> & { _id: string }): Tenant {
  return {
    _id: overrides._id,
    tenantId: overrides.tenantId ?? overrides._id,
    name: overrides.name ?? `Tenant ${overrides._id}`,
    subdomain: overrides.subdomain ?? `sub${overrides._id}`,
    email: overrides.email ?? `t${overrides._id}@example.com`,
    plan: (overrides.plan as any) ?? 'basic',
    status: (overrides.status as any) ?? 'active',
    createdAt: overrides.createdAt ?? '2026-03-15T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-15T00:00:00.000Z',
    maxUsers: 10,
    maxAssets: 100,
    features: {
      workOrders: true, assets: true, reports: true, pdfGeneration: true, apiAccess: false, customBranding: false, prioritySupport: false,
    },
    stats: overrides.stats ?? { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '2026-03-15T00:00:00.000Z' },
    ...overrides,
  } as Tenant
}

describe('tenantStats pure aggregation', () => {
  it('aggregates 5 tenants fixture to totalTenants 5, active 3, totalUsers 8, totalAssets 13', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', plan: 'basic', status: 'active', stats: { totalUsers: 2, totalAssets: 10, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '2', plan: 'professional', status: 'active', createdAt: '2026-01-10T00:00:00.000Z', stats: { totalUsers: 5, totalAssets: 0, totalWorkOrders: 1, lastActivity: '' } }),
      makeTenant({ _id: '3', plan: 'enterprise', status: 'suspended', stats: { totalUsers: 1, totalAssets: 3, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '4', plan: 'basic', status: 'cancelled', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '5', plan: 'professional', status: 'active', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
    ]
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(agg.totalTenants).toBe(5)
    expect(agg.activeTenants).toBe(3)
    expect(agg.totalUsers).toBe(8)
    expect(agg.totalAssets).toBe(13)
  })

  it('empty tenants yields zeros without NaN', () => {
    const agg = aggregateTenantStats([], { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(agg.totalTenants).toBe(0)
    expect(agg.activeTenants).toBe(0)
    expect(agg.totalUsers).toBe(0)
    expect(agg.totalAssets).toBe(0)
    expect(agg.suspendedTenants).toBe(0)
    expect(agg.cancelledTenants).toBe(0)
    expect(Number.isNaN(agg.totalUsers)).toBe(false)
    expect(agg.planDistribution.reduce((s, b) => s + b.value, 0)).toBe(0)
    expect(agg.statusDistribution.reduce((s, b) => s + b.value, 0)).toBe(0)
  })

  it('groups unknown plan/status into unknown bucket', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', plan: null as any, status: 'active', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '2', plan: undefined as any, status: undefined as any, stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '3', plan: 'basic', status: 'active', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
    ]
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    const unknownPlan = agg.planDistribution.find(b => b.key === 'unknown')!
    const unknownStatus = agg.statusDistribution.find(b => b.key === 'unknown')!
    expect(unknownPlan.value).toBe(2)
    expect(unknownStatus.value).toBe(1)
    expect(agg.planDistribution.reduce((s, b) => s + b.value, 0)).toBe(3)
    expect(agg.statusDistribution.reduce((s, b) => s + b.value, 0)).toBe(3)
  })

  it('does not mutate input tenants', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '2', createdAt: '2026-02-01T00:00:00.000Z', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
      makeTenant({ _id: '1', createdAt: '2026-01-01T00:00:00.000Z', stats: { totalUsers: 0, totalAssets: 0, totalWorkOrders: 0, lastActivity: '' } }),
    ]
    Object.freeze(tenants)
    const frozenFirst = tenants[0]
    Object.freeze(frozenFirst)
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(tenants[0]._id).toBe('2')
    expect(agg.recentTenants[0]._id).toBe('2')
  })

  it('evolution 6 buckets Jan-Jun 2026 zero-filled [2,1,0,3,1,4]', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', createdAt: '2026-01-05T00:00:00.000Z' }),
      makeTenant({ _id: '2', createdAt: '2026-01-15T00:00:00.000Z' }),
      makeTenant({ _id: '3', createdAt: '2026-02-10T00:00:00.000Z' }),
      // March 0
      makeTenant({ _id: '4', createdAt: '2026-04-01T00:00:00.000Z' }),
      makeTenant({ _id: '5', createdAt: '2026-04-12T00:00:00.000Z' }),
      makeTenant({ _id: '6', createdAt: '2026-04-20T00:00:00.000Z' }),
      makeTenant({ _id: '7', createdAt: '2026-05-03T00:00:00.000Z' }),
      makeTenant({ _id: '8', createdAt: '2026-06-02T00:00:00.000Z' }),
      makeTenant({ _id: '9', createdAt: '2026-06-10T00:00:00.000Z' }),
      makeTenant({ _id: '10', createdAt: '2026-06-15T00:00:00.000Z' }),
      makeTenant({ _id: '11', createdAt: '2026-06-20T00:00:00.000Z' }),
    ]
    const evo = buildEvolution(tenants, new Date('2026-06-15T00:00:00.000Z'), 6)
    expect(evo.map(p => p.value)).toEqual([2, 1, 0, 3, 1, 4])
    expect(evo).toHaveLength(6)
    expect(evo[5].name).toBe('2026-06')
  })

  it('evolution placeholder when <2 real points (all zeros except one)', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', createdAt: '2026-06-01T00:00:00.000Z' }),
    ]
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    // evolutionData still 6 buckets but placeholder logic is rendering layer; we ensure buckets logic yields single point
    const nonZero = agg.evolutionData.filter(p => p.value > 0).length
    expect(nonZero).toBe(1)
    expect(agg.evolutionData).toHaveLength(6)
  })

  it('sums of plan/status distributions equal totalTenants', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', plan: 'basic', status: 'active' }),
      makeTenant({ _id: '2', plan: 'professional', status: 'suspended' }),
      makeTenant({ _id: '3', plan: null as any, status: null as any }),
    ]
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(agg.planDistribution.reduce((s, b) => s + b.value, 0)).toBe(3)
    expect(agg.statusDistribution.reduce((s, b) => s + b.value, 0)).toBe(3)
  })

  it('formatCount uses thousands separators', () => {
    expect(formatCount(12450)).toBe('12,450')
    expect(formatCount(0)).toBe('0')
    expect(formatCount(100200)).toBe('100,200')
  })

  it('recentTenants returns newest 5 sorted desc', () => {
    const tenants: Tenant[] = Array.from({ length: 7 }, (_, i) => makeTenant({ _id: String(i + 1), createdAt: `2026-0${i + 1}-01T00:00:00.000Z` }))
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(agg.recentTenants).toHaveLength(5)
    expect(agg.recentTenants[0]._id).toBe('7')
    expect(agg.recentTenants[4]._id).toBe('3')
  })

  it('EMPTY_AGGREGATE has zero shape', () => {
    expect(EMPTY_AGGREGATE.totalTenants).toBe(0)
    expect(EMPTY_AGGREGATE.evolutionData).toHaveLength(6)
  })

  it('toDistribution respects fixed order', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', plan: 'enterprise' }),
      makeTenant({ _id: '2', plan: 'basic' }),
      makeTenant({ _id: '3', plan: 'professional' }),
    ]
    const dist = toDistribution(tenants, t => t.plan, ['basic', 'professional', 'enterprise', 'unknown'])
    expect(dist.map(d => d.key)).toEqual(['basic', 'professional', 'enterprise', 'unknown'])
    expect(dist.map(d => d.value)).toEqual([1, 1, 1, 0])
  })

  it('handles stats.totalUsers undefined guard', () => {
    const tenants: Tenant[] = [
      makeTenant({ _id: '1', stats: undefined as any }),
      makeTenant({ _id: '2', stats: { totalUsers: undefined as any, totalAssets: 5, totalWorkOrders: 0, lastActivity: '' } as any }),
    ]
    const agg = aggregateTenantStats(tenants, { now: new Date('2026-06-15T00:00:00.000Z') })
    expect(agg.totalUsers).toBe(0)
    expect(agg.totalAssets).toBe(5)
  })

  it('formatCount locale-aware 10k+', () => {
    expect(formatCount(10000)).toBe('10,000')
    expect(formatCount(12450, 'en-US')).toBe('12,450')
    expect(formatCount(12345, 'de-DE')).toBe('12.345')
  })
})

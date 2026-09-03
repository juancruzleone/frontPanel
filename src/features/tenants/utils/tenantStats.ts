import type { Tenant } from '../types/tenant.types'

export interface DistributionBucket { key: string; value: number }
export interface EvolutionPoint { name: string; label: string; value: number }

export interface TenantAggregate {
  totalTenants: number
  activeTenants: number
  suspendedTenants: number
  cancelledTenants: number
  totalUsers: number
  totalAssets: number
  totalWorkOrders: number
  planDistribution: DistributionBucket[]
  statusDistribution: DistributionBucket[]
  evolutionData: EvolutionPoint[]
  recentTenants: Tenant[]
}

const PLAN_ORDER = ['basic', 'professional', 'enterprise', 'unknown'] as const
const STATUS_ORDER = ['active', 'suspended', 'cancelled', 'unknown'] as const

function getPlanKey(t: Tenant): string {
  const p = (t as any).plan
  if (p === 'basic' || p === 'professional' || p === 'enterprise') return p
  return 'unknown'
}

function getStatusKey(t: Tenant): string {
  const s = (t as any).status
  if (s === 'active' || s === 'suspended' || s === 'cancelled') return s
  return 'unknown'
}

export function toDistribution(
  tenants: readonly Tenant[],
  pick: (t: Tenant) => string | null | undefined,
  order: readonly string[]
): DistributionBucket[] {
  const counts = new Map<string, number>()
  order.forEach(k => counts.set(k, 0))
  for (const t of tenants) {
    const raw = pick(t)
    const key = raw && order.includes(raw) ? raw : 'unknown'
    const normalized = order.includes(key) ? key : 'unknown'
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return order.map(key => ({ key, value: counts.get(key) ?? 0 }))
}

export function buildEvolution(tenants: readonly Tenant[], now: Date = new Date(), months: number = 6): EvolutionPoint[] {
  const points: EvolutionPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const name = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    points.push({ name, label, value: 0 })
  }
  // map name -> index
  const indexByName = new Map(points.map((p, i) => [p.name, i]))
  for (const t of tenants) {
    if (!t.createdAt) continue
    const cd = new Date(t.createdAt)
    if (Number.isNaN(cd.getTime())) continue
    const key = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`
    const idx = indexByName.get(key)
    if (idx !== undefined) points[idx].value += 1
  }
  return points
}

export function formatCount(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export const EMPTY_AGGREGATE: TenantAggregate = {
  totalTenants: 0,
  activeTenants: 0,
  suspendedTenants: 0,
  cancelledTenants: 0,
  totalUsers: 0,
  totalAssets: 0,
  totalWorkOrders: 0,
  planDistribution: PLAN_ORDER.map(k => ({ key: k, value: 0 })),
  statusDistribution: STATUS_ORDER.map(k => ({ key: k, value: 0 })),
  evolutionData: buildEvolution([], new Date('2026-06-15T00:00:00.000Z'), 6),
  recentTenants: [],
}

export function aggregateTenantStats(
  tenants: readonly Tenant[],
  opts?: { now?: Date; months?: number }
): TenantAggregate {
  const now = opts?.now ?? new Date()
  const months = opts?.months ?? 6

  const totalTenants = tenants.length
  let activeTenants = 0
  let suspendedTenants = 0
  let cancelledTenants = 0
  let totalUsers = 0
  let totalAssets = 0
  let totalWorkOrders = 0

  for (const t of tenants) {
    const status = getStatusKey(t)
    if (status === 'active') activeTenants++
    else if (status === 'suspended') suspendedTenants++
    else if (status === 'cancelled') cancelledTenants++

    totalUsers += (t as any)?.stats?.totalUsers ?? 0
    totalAssets += (t as any)?.stats?.totalAssets ?? 0
    totalWorkOrders += (t as any)?.stats?.totalWorkOrders ?? 0
  }

  const planDistribution = toDistribution(tenants, t => getPlanKey(t), PLAN_ORDER)
  const statusDistribution = toDistribution(tenants, t => getStatusKey(t), STATUS_ORDER)
  const evolutionData = buildEvolution(tenants, now, months)

  // recentTenants: copy, sort desc by createdAt, slice 5
  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return {
    totalTenants,
    activeTenants,
    suspendedTenants,
    cancelledTenants,
    totalUsers,
    totalAssets,
    totalWorkOrders,
    planDistribution,
    statusDistribution,
    evolutionData,
    recentTenants,
  }
}

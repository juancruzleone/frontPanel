import { useState, useEffect, useCallback, useRef } from 'react'
import { tenantServices } from '../services/tenantServices'
import { aggregateTenantStats, EMPTY_AGGREGATE, type TenantAggregate } from '../utils/tenantStats'

export type PanelAdminErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'server'

export interface PanelAdminMeta { pages: number; total: number; truncated: boolean }

export interface UsePanelAdminDashboard {
  stats: TenantAggregate
  meta: PanelAdminMeta | null
  loading: boolean
  refreshing: boolean
  error: { kind: PanelAdminErrorKind; messageKey: string } | null
  lastUpdated: string | null
  retry: () => void
}

function mapError(err: any): { kind: PanelAdminErrorKind; messageKey: string } {
  const status = err?.status
  const msg = String(err?.message ?? '')
  if (status === 401) return { kind: 'unauthorized', messageKey: 'superAdmin.dashboard.errors.unauthorized' }
  if (status === 403 || msg.includes('No tienes permisos') || msg.includes('permisos')) return { kind: 'forbidden', messageKey: 'superAdmin.dashboard.errors.forbidden' }
  if (msg.includes('AbortError') || err?.name === 'AbortError') return { kind: 'network', messageKey: 'superAdmin.dashboard.errors.network' }
  if (status && status >= 500) return { kind: 'server', messageKey: 'superAdmin.dashboard.errors.server' }
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) return { kind: 'network', messageKey: 'superAdmin.dashboard.errors.network' }
  return { kind: 'server', messageKey: 'superAdmin.dashboard.errors.loadFailed' }
}

const usePanelAdminDashboard = (): UsePanelAdminDashboard => {
  const [stats, setStats] = useState<TenantAggregate>(EMPTY_AGGREGATE)
  const [meta, setMeta] = useState<PanelAdminMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<{ kind: PanelAdminErrorKind; messageKey: string } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const retry = useCallback(() => setAttempt(a => a + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    let cancelled = false

    const run = async () => {
      const isFirst = attempt === 0 && !lastUpdated && !error
      if (isFirst) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const { tenants, meta: fetchedMeta } = await tenantServices.fetchTenantsForAggregation({ pageSize: 100, maxPages: 25, signal: controller.signal })
        if (cancelled || controller.signal.aborted) return
        const agg = aggregateTenantStats(tenants)
        setStats(agg)
        setMeta(fetchedMeta)
        setLastUpdated(new Date().toISOString())
      } catch (e: any) {
        if (e?.name === 'AbortError' || controller.signal.aborted) return
        setError(mapError(e))
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  return { stats, meta, loading, refreshing, error, lastUpdated, retry }
}

export default usePanelAdminDashboard

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthStore } from "../../../store/authStore"
import { buildHomeCacheKey, useHomeStore } from "../../../store/homeStore"
import { getAuthHeaders } from "../../../shared/utils/apiHeaders"
import { fetchInventoryItems } from "../../inventory/services/inventoryServices"
import {
  expectedDashboardScope,
  mapDashboardStats,
  normalizeDashboardRole,
} from "../services/homeDashboardMapper"
import type {
  DashboardStatsResponse,
  HomeDashboardState,
  InventorySummaryData,
  RangeOption,
} from "../types/homeTypes"

const fetchDashboardStats = async (range: RangeOption): Promise<DashboardStatsResponse> => {
  const apiUrl = import.meta.env.VITE_API_URL || "/api/"
  const response = await fetch(`${apiUrl}dashboard/stats?range=${range}`, {
    headers: getAuthHeaders(true),
    credentials: "include",
  })

  const payload = await response.json() as DashboardStatsResponse
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || "DASHBOARD_LOAD_FAILED")
  }
  return payload
}

const fetchInventorySummary = async (): Promise<InventorySummaryData> => {
  const [allItems, lowStockItems] = await Promise.all([
    fetchInventoryItems({ page: 1, limit: 1 }),
    fetchInventoryItems({ page: 1, limit: 1, lowStock: true }),
  ])
  return {
    totalItems: allItems.total ?? allItems.items?.length ?? 0,
    lowStockItems: lowStockItems.total ?? lowStockItems.items?.length ?? 0,
  }
}

export const useHomeDashboard = (): HomeDashboardState => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const userId = useAuthStore((state) => state.userId)
  const tenantId = useAuthStore((state) => state.tenantId)
  const rawRole = useAuthStore((state) => state.role)
  const cache = useHomeStore((state) => state.cache)
  const lastUpdated = useHomeStore((state) => state.lastUpdated)
  const setDashboardData = useHomeStore((state) => state.setDashboardData)
  const role = normalizeDashboardRole(rawRole)
  const cacheKey = buildHomeCacheKey(tenantId, userId, rawRole)
  const validCache = cacheKey && cache?.cacheKey === cacheKey ? cache : null
  const validCacheRef = useRef(validCache)
  validCacheRef.current = validCache

  const [range, setRange] = useState<RangeOption>("30d")
  const [data, setData] = useState<HomeDashboardState["data"]>(null)
  const [inventory, setInventory] = useState<InventorySummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inventoryError, setInventoryError] = useState(false)
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine)
  const [isStale, setIsStale] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  const applyCachedData = useCallback((): boolean => {
    const currentCache = validCacheRef.current
    if (!currentCache || !role || currentCache.dashboard.metadata.range !== range) return false
    try {
      setData(mapDashboardStats(currentCache.dashboard, role))
      setInventory(currentCache.inventory)
      setIsStale(true)
      return true
    } catch {
      setDashboardData(null)
      return false
    }
  }, [range, role, setDashboardData])

  const retry = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      retry()
    }
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [retry])

  useEffect(() => {
    if (!isAuthenticated) return
    if (!role || !cacheKey) {
      setData(null)
      setError("home.dashboard.errors.unsupportedRole")
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      setInventoryError(false)

      if (!navigator.onLine) {
        setIsOffline(true)
        if (!applyCachedData()) setError("home.dashboard.errors.offlineUnavailable")
        setLoading(false)
        return
      }

      try {
        const response = await fetchDashboardStats(range)
        if (response.data.metadata.scope !== expectedDashboardScope(role)) {
          throw new Error("DASHBOARD_SCOPE_MISMATCH")
        }
        if (response.data.metadata.range !== range) {
          throw new Error("DASHBOARD_RANGE_MISMATCH")
        }

        let inventorySummary: InventorySummaryData | null = null
        if (role === "admin") {
          try {
            inventorySummary = await fetchInventorySummary()
          } catch {
            if (!cancelled) setInventoryError(true)
          }
        }

        if (cancelled) return
        const mapped = mapDashboardStats(response.data, role)
        setData(mapped)
        setInventory(inventorySummary)
        setIsOffline(false)
        setIsStale(false)
        setDashboardData({ cacheKey, dashboard: response.data, inventory: inventorySummary })
      } catch {
        if (cancelled) return
        if (!applyCachedData()) {
          setData(null)
          setError("home.dashboard.errors.loadFailed")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [applyCachedData, cacheKey, isAuthenticated, range, requestVersion, role, setDashboardData])

  useEffect(() => {
    if (!validCache || !lastUpdated) return
    setIsStale(Date.now() - lastUpdated > 15 * 60 * 1000)
  }, [lastUpdated, validCache])

  return {
    data,
    inventory,
    loading,
    refreshing: loading && data !== null,
    error,
    inventoryError,
    range,
    isOffline,
    isStale,
    setRange,
    retry,
  }
}

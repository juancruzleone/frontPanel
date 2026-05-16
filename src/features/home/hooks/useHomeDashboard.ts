import { useEffect, useState, useCallback, useRef } from "react"
import { 
  Home, 
  Package, 
  ClipboardList, 
  User, 
  AlertTriangle, 
  Clock, 
  Activity, 
  CheckCircle, 
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../../store/authStore"
import { useHomeStore } from "../../../store/homeStore"
import { WORK_ORDER_TYPE_COLORS, WORK_ORDER_STATUS_COLORS } from "../../../utils/chartColors"
import { getAuthHeaders } from "../../../shared/utils/apiHeaders"
import { translateFrequencyToCurrentLang } from "../../../shared/utils/backendTranslations"
import { fetchInventoryAssets, fetchInventoryItems } from "../../inventory/services/inventoryServices"
import { InventoryAsset, InventoryItem } from "../../inventory/types/inventory.types"
import { fetchWorkOrders, WorkOrder } from "../../workOrders/services/workOrderServices"
import { 
  RangeOption, 
  KPIItem, 
  ChartDataItem, 
  MultiSeriesLineData, 
  TopIncidentInstallation, 
  UpcomingPreventive,
  InventoryStat,
  DashboardAlert
} from "../types/homeTypes"

const normalizeName = (name: string) => name.trim().toLocaleLowerCase()

const getAssetName = (asset: InventoryAsset): string => asset.nombre || asset.name || ''

const getAssetCurrentStock = (asset: InventoryAsset): number => {
  if (typeof asset.currentStock === 'number') return asset.currentStock
  if (typeof asset.stock === 'number') return asset.stock

  return 1
}

const getAssetMinimumStock = (asset: InventoryAsset): number => {
  if (typeof asset.minimumStock === 'number') return asset.minimumStock
  if (typeof asset.stockMinimo === 'number') return asset.stockMinimo

  return 0
}

const buildInventoryRows = (inventoryItems: InventoryItem[], assets: InventoryAsset[]): InventoryItem[] => {
  const linkedAssetIds = new Set(
    inventoryItems
      .flatMap((item) => [item.assetId, item.activoId])
      .filter((id): id is string => Boolean(id))
  )
  const itemNames = new Set(inventoryItems.map((item) => normalizeName(item.name)))

  const assetRows = assets
    .filter((asset) => {
      const assetName = getAssetName(asset)
      if (!assetName) return false
      if (asset._id && linkedAssetIds.has(asset._id)) return false

      return !itemNames.has(normalizeName(assetName))
    })
    .map<InventoryItem>((asset) => ({
      _id: asset._id ? `asset-${asset._id}` : undefined,
      tenantId: '',
      name: getAssetName(asset),
      category: asset.category || asset.categoria,
      unit: asset.unit || asset.unidad || 'unidades',
      currentStock: getAssetCurrentStock(asset),
      minimumStock: getAssetMinimumStock(asset),
      location: asset.location || asset.ubicacion,
      active: asset.active ?? true,
      assetId: asset._id,
      inventorySource: 'asset',
    }))

  return [...inventoryItems, ...assetRows]
}

const buildInventoryStats = (rows: InventoryItem[]): InventoryStat[] => {
  const activeRows = rows.filter((item) => item.active !== false)
  const lowStock = activeRows.filter((item) => item.minimumStock > 0 && item.currentStock <= item.minimumStock).length
  const withoutStock = activeRows.filter((item) => item.currentStock <= 0).length
  const availableStock = activeRows.reduce((total, item) => total + Math.max(item.currentStock, 0), 0)

  return [
    { label: 'inventory.title', value: activeRows.length, color: 'var(--color-primary)' },
    { label: 'inventory.stockStatusLow', value: lowStock, color: lowStock > 0 ? '#f57c00' : '#2e7d32' },
    { label: 'inventory.availableStock', value: availableStock, color: '#0288d1' },
    { label: 'inventory.stockStatus', value: withoutStock, color: withoutStock > 0 ? '#c62828' : '#2e7d32' },
  ]
}

const isOverdueWorkOrder = (order: WorkOrder): boolean => {
  if (['completada', 'cancelada'].includes(order.estado)) return false

  const scheduledDate = new Date(order.fechaProgramada)
  if (Number.isNaN(scheduledDate.getTime())) return false

  return scheduledDate.getTime() < Date.now()
}

const getInstallationName = (order: WorkOrder, fallback: string): string => order.instalacion?.company || fallback

const useHomeDashboard = () => {
  const { t, i18n } = useTranslation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const { userId } = useAuthStore()
  const { dashboardData: storedData, setDashboardData, ownerId } = useHomeStore()

  const validStoredData = ownerId === userId ? storedData : null
  const validStoredDataRef = useRef(validStoredData)

  useEffect(() => {
    validStoredDataRef.current = validStoredData
  }, [validStoredData])
  
  const [range, setRange] = useState<RangeOption>("30d")
  const [kpis, setKpis] = useState<KPIItem[]>([])
  const [operationalKpis, setOperationalKpis] = useState<KPIItem[]>([])
  const [simplifiedKpis, setSimplifiedKpis] = useState<KPIItem[]>([])
  const [barChartData, setBarChartData] = useState<ChartDataItem[]>([])
  const [pieChartData, setPieChartData] = useState<ChartDataItem[]>([])
  const [priorityData, setPriorityData] = useState<ChartDataItem[]>([])
  const [prevVsCorrData, setPrevVsCorrData] = useState<ChartDataItem[]>([])
  const [deviceHealthData, setDeviceHealthData] = useState<ChartDataItem[]>([])
  const [lineChartData, setLineChartData] = useState<MultiSeriesLineData[]>([])
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([])
  const [topIncidentInstallations, setTopIncidentInstallations] = useState<TopIncidentInstallation[]>([])
  const [upcomingPreventive, setUpcomingPreventive] = useState<UpcomingPreventive[]>([])
  const [inventoryStats, setInventoryStats] = useState<InventoryStat[]>([])
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const translateUpcomingPlanName = useCallback((planName?: string) => {
    if (!planName) return t('home.upcomingPreventive', { defaultValue: 'Preventivo' })

    const normalized = planName.trim()
    const lower = normalized.toLowerCase()

    const preventivePrefixes = [
      'mantenimiento preventivo',
      'preventive maintenance',
    ]

    const matchedPrefix = preventivePrefixes.find(prefix => lower.startsWith(prefix))

    if (!matchedPrefix) {
      return normalized
    }

    const suffix = normalized.slice(matchedPrefix.length).trim()
    const cleanedSuffix = suffix.replace(/^[-–—:]\s*/, '').trim()
    const preventiveLabel = t('maintenanceRequests.problemType.preventiveMaintenance', {
      defaultValue: 'Mantenimiento Preventivo',
    })

    if (!cleanedSuffix) {
      return preventiveLabel
    }

    return `${preventiveLabel} - ${translateFrequencyToCurrentLang(cleanedSuffix, i18n.language || 'es')}`
  }, [i18n.language, t])

  const processDashboardData = useCallback((data: any, workOrdersResult: any, inventoryRows: any[]) => {
      const { 
        kpis: kpisRaw, 
        operationalKpis: opKpisRawFromApi,
        charts, 
        recentWorkOrders: recent, 
        topIncidentInstallations: topIncidents,
        upcomingPreventive: upcoming,
        metadata 
      } = data || {}
      const opKpisRaw = opKpisRawFromApi || kpisRaw || {}
      const overdueOrders = (workOrdersResult?.data || []).filter(isOverdueWorkOrder)
      const backendColors = metadata?.suggestedStatusColors || {}

      // 1. Mapear KPIs Base
      const kpisData: KPIItem[] = [
        {
          id: 'installations',
          label: 'installations.title',
          value: kpisRaw?.installations || 0,
          icon: Home,
          color: "var(--color-primary)",
          path: "/instalaciones"
        },
        {
          id: 'assets',
          label: 'assets.title',
          value: kpisRaw?.assets || 0,
          icon: Package,
          color: "#057E74",
          path: "/activos"
        },
        {
          id: 'workOrders',
          label: 'workOrders.title',
          value: kpisRaw?.workOrders || 0,
          icon: ClipboardList,
          color: "#fbc02d",
          path: "/ordenes-trabajo"
        },
        {
          id: 'technicians',
          label: 'personal.title',
          value: kpisRaw?.technicians || 0,
          icon: User,
          color: "#e53935",
          path: "/personal"
        }
      ]
      setKpis(kpisData)

      // 2. Mapear KPIs Operacionales
      const opKpisData: KPIItem[] = [
        {
          id: 'openWorkOrders',
          label: 'home.openWorkOrders',
          value: opKpisRaw?.openWorkOrders || 0,
          icon: ClipboardList,
          color: "var(--color-primary)"
        },
        {
          id: 'overdueWorkOrders',
          label: 'home.overdueWorkOrders',
          value: opKpisRaw?.overdueWorkOrders || 0,
          icon: Clock,
          color: "#e53935"
        },
        {
          id: 'criticalWorkOrders',
          label: 'home.criticalWorkOrders',
          value: opKpisRaw?.criticalWorkOrders || 0,
          icon: AlertTriangle,
          color: "#c62828"
        },
        {
          id: 'mttrHours',
          label: 'home.mttrHours',
          value: opKpisRaw?.mttrHours?.toFixed(1) || "0.0",
          icon: Activity,
          color: "#1565c0",
          suffix: "h"
        },
        {
          id: 'mtbfHours',
          label: 'home.mtbfHours',
          value: opKpisRaw?.mtbfHours?.toFixed(1) || "0.0",
          icon: Activity,
          color: "#7b1fa2",
          suffix: "h"
        },
        {
          id: 'preventiveCompliance',
          label: 'home.preventiveCompliance',
          value: opKpisRaw?.preventiveComplianceRate?.toFixed(0) || "0",
          icon: CheckCircle,
          color: "#2e7d32",
          suffix: "%"
        },
        {
          id: 'slaRate',
          label: 'home.slaRate',
          value: (opKpisRaw?.slaRate !== undefined && opKpisRaw?.slaRate !== null) ? opKpisRaw.slaRate.toFixed(0) : "N/A",
          icon: TrendingUp,
          color: "#0288d1",
          suffix: (opKpisRaw?.slaRate !== undefined && opKpisRaw?.slaRate !== null) ? "%" : ""
        },
        {
          id: 'responseTime',
          label: 'home.responseTime',
          value: (opKpisRaw?.responseTimeHours !== undefined && opKpisRaw?.responseTimeHours !== null) ? opKpisRaw.responseTimeHours.toFixed(1) : "N/A",
          icon: Clock,
          color: "#f57c00",
          suffix: (opKpisRaw?.responseTimeHours !== undefined && opKpisRaw?.responseTimeHours !== null) ? "h" : ""
        }
      ]
      setOperationalKpis(opKpisData)
      
      // 2.1 Mapear KPIs Simplificados (Combinados)
      const simplifiedKpisData: KPIItem[] = [
        {
          id: 'workOrders',
          label: 'workOrders.title',
          value: kpisRaw?.workOrders || 0,
          icon: ClipboardList,
          color: "#fbc02d",
          path: "/ordenes-trabajo"
        },
        {
          id: 'openWorkOrders',
          label: 'home.openWorkOrders',
          value: opKpisRaw?.openWorkOrders || 0,
          icon: Activity,
          color: "var(--color-primary)"
        },
        {
          id: 'overdueWorkOrders',
          label: 'home.overdueWorkOrders',
          value: opKpisRaw?.overdueWorkOrders || 0,
          icon: Clock,
          color: "#e53935"
        },
        {
          id: 'preventiveCompliance',
          label: 'home.preventiveCompliance',
          value: opKpisRaw?.preventiveComplianceRate?.toFixed(0) || "0",
          icon: CheckCircle,
          color: "#2e7d32",
          suffix: "%"
        },
        {
          id: 'slaRate',
          label: 'home.slaRate',
          value: (opKpisRaw?.slaRate !== undefined && opKpisRaw?.slaRate !== null) ? opKpisRaw.slaRate.toFixed(0) : "N/A",
          icon: TrendingUp,
          color: "#0288d1",
          suffix: (opKpisRaw?.slaRate !== undefined && opKpisRaw?.slaRate !== null) ? "%" : ""
        },
        {
          id: 'criticalWorkOrders',
          label: 'home.criticalWorkOrders',
          value: opKpisRaw?.criticalWorkOrders || 0,
          icon: AlertCircle,
          color: "#c62828"
        }
      ]
      setSimplifiedKpis(simplifiedKpisData)

      // 3. Bar Chart (Órdenes por tipo)
      const barData = (charts?.byType || []).map((item: any) => {
        const typeName = item.name.toLowerCase()
        const typeMapping: { [key: string]: string } = {
          'mantenimiento': 'maintenance',
          'reparación': 'repair',
          'reparacion': 'repair',
          'instalación': 'installation',
          'instalacion': 'installation',
          'inspección': 'inspection',
          'inspeccion': 'inspection',
          'otro': 'other'
        }
        const mappedName = typeMapping[typeName] || typeName
        return {
          name: mappedName,
          value: item.value,
          color: WORK_ORDER_TYPE_COLORS[mappedName] || 'var(--color-primary)'
        }
      })
      setBarChartData(barData)

      // 4. Pie Chart (Órdenes por estado)
      const pieData = (charts?.byStatus || []).map((item: any) => {
        const statusName = item.name.toLowerCase()
        const statusMapping: { [key: string]: string } = {
          'pendiente': 'pending',
          'asignada': 'assigned',
          'en progreso': 'inProgress',
          'en_progreso': 'inProgress',
          'completada': 'completed',
          'cancelada': 'cancelled'
        }
        const mappedName = statusMapping[statusName] || statusName
        return {
          name: mappedName,
          value: item.value,
          color: WORK_ORDER_STATUS_COLORS[mappedName] || backendColors[statusName] || '#ccc'
        }
      })
      setPieChartData(pieData)

      // 5. Priority Chart
      const prioData = (charts?.byPriority || []).map((item: any) => {
        const priorityColors: { [key: string]: string } = {
          'baja': '#4caf50',
          'media': '#ff9800',
          'alta': '#f44336',
          'critica': '#b71c1c',
          'low': '#4caf50',
          'medium': '#ff9800',
          'high': '#f44336',
          'critical': '#b71c1c'
        }
        return {
          name: item.name,
          value: item.value,
          color: priorityColors[item.name.toLowerCase()] || '#ccc'
        }
      })
      setPriorityData(prioData)

      // 6. Preventive vs Corrective
      const pData = (charts?.preventiveVsCorrective || []).map((item: any) => {
        const typeColors: { [key: string]: string } = {
          'preventivo': '#4caf50',
          'correctivo': '#f44336',
          'preventive': '#4caf50',
          'corrective': '#f44336'
        }
        return {
          name: item.name,
          value: item.value,
          color: typeColors[item.name.toLowerCase()] || '#2196f3'
        }
      })
      setPrevVsCorrData(pData)

      // 7. Device Health
      const healthData = (charts?.deviceHealth || []).map((item: any) => {
        const healthColors: { [key: string]: string } = {
          'active': '#4caf50',
          'inactive': '#9e9e9e',
          'maintenance': '#ff9800',
          'outOfService': '#f44336',
          'pendingReview': '#2196f3',
          'activo': '#4caf50',
          'inactivo': '#9e9e9e'
        }
        return {
          name: item.name,
          value: item.value,
          color: healthColors[item.name] || healthColors[item.name.toLowerCase()] || '#ccc'
        }
      })
      setDeviceHealthData(healthData)

      // 8. Line Chart (Evolution)
      const evolution = (charts?.evolution || []).map((item: any) => ({
        ...item,
        name: item.name
      }))
      setLineChartData(evolution)

      // 9. Extra Lists
      setRecentWorkOrders(
        (recent || []).map((item: any) => ({
          ...item,
          titulo: translateUpcomingPlanName(item.titulo),
        })),
      )
      setTopIncidentInstallations(
        (topIncidents || []).map((item: { _id?: string; name?: string; count?: number; value?: number }, index: number) => ({
          _id: item._id || `${item.name || 'installation'}-${index}`,
          name: item.name || t('common.unknown', { defaultValue: 'Desconocida' }),
          count: item.count ?? item.value ?? 0,
        })),
      )
      setUpcomingPreventive(
        (upcoming || []).map(
          (item: { _id: string; installationName?: string; date?: string; planName?: string; fechaProgramada?: string; titulo?: string }) => ({
            _id: item._id,
            installationName: item.installationName || t('workOrders.noInstallation', { defaultValue: 'Sin instalación' }),
            date: item.date || item.fechaProgramada || '',
            planName: translateUpcomingPlanName(item.planName || item.titulo),
          }),
        ),
      )

      // 10. Inventory & Alerts
      setInventoryStats(buildInventoryStats(inventoryRows))

      const dashboardAlerts: DashboardAlert[] = overdueOrders.slice(0, 3).map((order: WorkOrder) => ({
        id: `overdue-${order._id || order.titulo}`,
        type: 'error',
        message: `${t('home.delayedOrders')}: ${order.titulo}`,
        detail: getInstallationName(order, t('workOrders.noInstallation')),
        date: typeof order.fechaProgramada === 'string' ? order.fechaProgramada : order.fechaProgramada?.toISOString(),
      }))

      if (dashboardAlerts.length === 0 && opKpisRaw?.overdueWorkOrders > 0) {
        dashboardAlerts.push({
          id: 'overdue-alert',
          type: 'error',
          message: `${t('home.delayedOrders')}: ${opKpisRaw.overdueWorkOrders}`,
          detail: t('home.kpiDescriptions.overdueWorkOrders', { defaultValue: '' }),
        })
      }

      const criticalOrders = (workOrdersResult?.data || [])
        .filter((order: WorkOrder) => order.prioridad === 'critica' || order.prioridad === 'critical')
        .filter((order: WorkOrder) => !['completada', 'cancelada'].includes(order.estado))

      if (criticalOrders.length > 0) {
        criticalOrders.slice(0, Math.max(0, 3 - dashboardAlerts.length)).forEach((order: WorkOrder) => {
          dashboardAlerts.push({
            id: `critical-${order._id || order.titulo}`,
            type: 'warning',
            message: `${t('home.criticalWorkOrders')}: ${order.titulo}`,
            detail: getInstallationName(order, t('workOrders.noInstallation')),
            date: typeof order.fechaProgramada === 'string' ? order.fechaProgramada : order.fechaProgramada?.toISOString(),
          })
        })
      } else if (opKpisRaw?.criticalWorkOrders > 0 && dashboardAlerts.length < 3) {
        dashboardAlerts.push({
          id: 'critical-alert',
          type: 'warning',
          message: `${t('home.criticalWorkOrders')}: ${opKpisRaw.criticalWorkOrders}`,
          detail: t('home.kpiDescriptions.criticalWorkOrders', { defaultValue: '' }),
        })
      }

      setAlerts(dashboardAlerts)
  }, [t, translateUpcomingPlanName])

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    
    const cachedDashboardData = validStoredDataRef.current

    // Fallback offline inmediato si no hay conexión
    if (!navigator.onLine && cachedDashboardData) {
      processDashboardData(cachedDashboardData.result, cachedDashboardData.workOrdersResult, cachedDashboardData.inventoryRows)
      setLoading(false)
      return
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || "/api/"
      const headers = getAuthHeaders(true)
      
      const response = await fetch(`${API_URL}dashboard/stats?range=${range}`, {
        headers,
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Error al cargar datos del dashboard')

      const resultData = await response.json()
      const [inventoryResult, inventoryAssets, workOrdersResult] = await Promise.all([
        fetchInventoryItems({ page: 1, limit: 1000 }).catch(() => ({ items: [] })),
        fetchInventoryAssets().catch(() => []),
        fetchWorkOrders(1, 1000).catch(() => ({ data: [], pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 } })),
      ])
      const inventoryRows = buildInventoryRows(inventoryResult.items || [], inventoryAssets)
      
      // Store data for offline use
      setDashboardData({ result: resultData.data, workOrdersResult, inventoryRows })
      
      processDashboardData(resultData.data, workOrdersResult, inventoryRows)

    } catch (e: any) {
      const fallbackDashboardData = validStoredDataRef.current

      if (fallbackDashboardData) {
        processDashboardData(fallbackDashboardData.result, fallbackDashboardData.workOrdersResult, fallbackDashboardData.inventoryRows)
      } else {
        setError(e.message || "Error al cargar el dashboard")
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, range, setDashboardData, processDashboardData])

  useEffect(() => {
    load()
  }, [load])

  return { 
    range, 
    setRange,
    kpis, 
    operationalKpis,
    simplifiedKpis,
    barChartData, 
    pieChartData, 
    priorityData,
    prevVsCorrData,
    deviceHealthData,
    lineChartData, 
    recentWorkOrders, 
    topIncidentInstallations,
    upcomingPreventive,
    inventoryStats,
    alerts,
    loading, 
    error 
  }
}

export default useHomeDashboard

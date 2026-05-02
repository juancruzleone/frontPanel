import { useEffect, useState, useCallback } from "react"
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
import { WORK_ORDER_TYPE_COLORS, WORK_ORDER_STATUS_COLORS } from "../../../utils/chartColors"
import { getAuthHeaders } from "../../../shared/utils/apiHeaders"
import { translateFrequencyToCurrentLang } from "../../../shared/utils/backendTranslations"
import { 
  RangeOption, 
  KPIItem, 
  ChartDataItem, 
  MultiSeriesLineData, 
  TopIncidentInstallation, 
  UpcomingPreventive 
} from "../types/homeTypes"

const useHomeDashboard = () => {
  const { t, i18n } = useTranslation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

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
  
  const [range, setRange] = useState<RangeOption>("30d")
  const [kpis, setKpis] = useState<KPIItem[]>([])
  const [operationalKpis, setOperationalKpis] = useState<KPIItem[]>([])
  const [barChartData, setBarChartData] = useState<ChartDataItem[]>([])
  const [pieChartData, setPieChartData] = useState<ChartDataItem[]>([])
  const [priorityData, setPriorityData] = useState<ChartDataItem[]>([])
  const [prevVsCorrData, setPrevVsCorrData] = useState<ChartDataItem[]>([])
  const [deviceHealthData, setDeviceHealthData] = useState<ChartDataItem[]>([])
  const [lineChartData, setLineChartData] = useState<MultiSeriesLineData[]>([])
  const [recentWorkOrders, setRecentWorkOrders] = useState<any[]>([])
  const [topIncidentInstallations, setTopIncidentInstallations] = useState<TopIncidentInstallation[]>([])
  const [upcomingPreventive, setUpcomingPreventive] = useState<UpcomingPreventive[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      const API_URL = import.meta.env.VITE_API_URL
      const headers = getAuthHeaders(true)
      
      const response = await fetch(`${API_URL}dashboard/stats?range=${range}`, {
        headers,
        credentials: 'include' // Important for HTTP-only cookies
      })

      if (!response.ok) throw new Error('Error al cargar datos del dashboard')

      const result = await response.json()
      const { 
        kpis: kpisRaw, 
        operationalKpis: opKpisRawFromApi,
        charts, 
        recentWorkOrders: recent, 
        topIncidentInstallations: topIncidents,
        upcomingPreventive: upcoming,
        metadata 
      } = result.data || {}
      const opKpisRaw = opKpisRawFromApi || kpisRaw || {}
      
      const backendColors = metadata?.suggestedStatusColors || {}

      // 1. Mapear KPIs Base
      const kpisData: KPIItem[] = [
        {
          label: 'installations.title',
          value: kpisRaw?.installations || 0,
          icon: Home,
          color: "var(--color-primary)",
          path: "/instalaciones"
        },
        {
          label: 'assets.title',
          value: kpisRaw?.assets || 0,
          icon: Package,
          color: "#057E74",
          path: "/activos"
        },
        {
          label: 'workOrders.title',
          value: kpisRaw?.workOrders || 0,
          icon: ClipboardList,
          color: "#fbc02d",
          path: "/ordenes-trabajo"
        },
        {
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
          label: 'home.openWorkOrders',
          value: opKpisRaw?.openWorkOrders || 0,
          icon: ClipboardList,
          color: "var(--color-primary)"
        },
        {
          label: 'home.overdueWorkOrders',
          value: opKpisRaw?.overdueWorkOrders || 0,
          icon: Clock,
          color: "#e53935"
        },
        {
          label: 'home.criticalWorkOrders',
          value: opKpisRaw?.criticalWorkOrders || 0,
          icon: AlertTriangle,
          color: "#c62828"
        },
        {
          label: 'home.mttrHours',
          value: opKpisRaw?.mttrHours?.toFixed(1) || "0.0",
          icon: Activity,
          color: "#1565c0",
          suffix: "h"
        },
        {
          label: 'home.mtbfHours',
          value: opKpisRaw?.mtbfHours?.toFixed(1) || "0.0",
          icon: Activity,
          color: "#7b1fa2",
          suffix: "h"
        },
        {
          label: 'home.preventiveCompliance',
          value: opKpisRaw?.preventiveComplianceRate?.toFixed(0) || "0",
          icon: CheckCircle,
          color: "#2e7d32",
          suffix: "%"
        }
      ]
      setOperationalKpis(opKpisData)

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
        name: item.name // Asegurar que name esté presente
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

    } catch (e: any) {
      setError(e.message || "Error al cargar el dashboard")
    } finally {
      setLoading(false)
    }
  }, [i18n.language, isAuthenticated, range, t, translateUpcomingPlanName])

  useEffect(() => {
    load()
  }, [load])

  return { 
    range, 
    setRange,
    kpis, 
    operationalKpis,
    barChartData, 
    pieChartData, 
    priorityData,
    prevVsCorrData,
    deviceHealthData,
    lineChartData, 
    recentWorkOrders, 
    topIncidentInstallations,
    upcomingPreventive,
    loading, 
    error 
  }
}

export default useHomeDashboard

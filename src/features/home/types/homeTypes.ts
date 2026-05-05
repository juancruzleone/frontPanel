import { LucideIcon } from "lucide-react"

export type RangeOption = "7d" | "30d" | "90d" | "12m"

export interface KPIItem {
  id: string
  label: string
  value: number | string
  icon: LucideIcon
  color: string
  path?: string
  suffix?: string
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
}

export interface ChartDataItem {
  name: string
  value: number
  color?: string
}

export interface MultiSeriesLineData {
  name: string
  [key: string]: number | string // Allow dynamic series names
}

export interface OperationalData {
  openWorkOrders: number
  overdueWorkOrders: number
  criticalWorkOrders: number
  mttrHours: number
  mtbfHours: number
  preventiveComplianceRate: number
  slaRate?: number
  responseTimeHours?: number
}

export interface TopIncidentInstallation {
  _id: string
  name: string
  count: number
}

export interface UpcomingPreventive {
  _id: string
  installationName: string
  date: string
  planName: string
}

export interface InventoryStat {
  label: string
  value: string | number
  color: string
}

export interface DashboardAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  date?: string
  detail?: string
}

export interface HomeDashboardData {
  kpis: KPIItem[]
  operationalKpis: KPIItem[]
  charts: {
    byType: ChartDataItem[]
    byStatus: ChartDataItem[]
    byPriority: ChartDataItem[]
    preventiveVsCorrective: ChartDataItem[]
    deviceHealth: ChartDataItem[]
    evolution: MultiSeriesLineData[]
  }
  recentWorkOrders: any[]
  topIncidentInstallations: TopIncidentInstallation[]
  upcomingPreventive: UpcomingPreventive[]
  inventoryStats: InventoryStat[]
  alerts: DashboardAlert[]
  loading: boolean
  error: string | null
  range: RangeOption
  setRange: (range: RangeOption) => void
}

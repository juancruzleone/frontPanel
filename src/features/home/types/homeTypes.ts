export type RangeOption = "7d" | "30d" | "90d" | "12m"

export type DashboardRole = "admin" | "technician" | "client"
export type DashboardScope = "tenant" | "assigned_work" | "assigned_installations"

export interface DashboardMetadataDto {
  lastUpdate: string
  range: RangeOption
  scope: DashboardScope
  fallbackApplied: boolean
  suggestedStatusColors?: Record<string, string>
}

export interface DashboardKpisDto {
  installations: number
  assets: number
  workOrders: number
  technicians: number
  openWorkOrders: number
  overdueWorkOrders: number
  criticalWorkOrders: number
  mttrHours: number
  mtbfHours: number
  preventiveComplianceRate: number
  slaRate: number | null
  responseTimeHours: number | null
}

export interface OperationalKpisDto {
  openWorkOrders: number
  overdueWorkOrders: number
  criticalWorkOrders: number
  mttrHours: number
  mtbfHours: number
  preventiveComplianceRate: number
  slaRate: number | null
  responseTimeHours: number | null
}

export interface ChartDataItem {
  name: string
  value: number
  color?: string
}

export interface EvolutionDataItem {
  name: string
  created: number
  completed: number
}

export interface RecentWorkOrderDto {
  _id: string
  titulo: string
  estado: string
  fechaCreacion?: string
  instalacion?: { company?: string }
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

export interface DashboardStatsDto {
  metadata: DashboardMetadataDto
  kpis: DashboardKpisDto
  operationalKpis: OperationalKpisDto
  charts: {
    byStatus: ChartDataItem[]
    byType: ChartDataItem[]
    byPriority: ChartDataItem[]
    preventiveVsCorrective: ChartDataItem[]
    deviceHealth: ChartDataItem[]
    evolution: EvolutionDataItem[]
  }
  recentWorkOrders: RecentWorkOrderDto[]
  topIncidentInstallations: TopIncidentInstallation[]
  upcomingPreventive: Array<{
    _id: string
    installationName?: string
    date?: string
    planName?: string
    fechaProgramada?: string
    titulo?: string
  }>
}

export interface DashboardStatsResponse {
  success: boolean
  data: DashboardStatsDto
  message?: string
}

export interface DashboardMetric {
  id: keyof OperationalKpisDto
  value: number | null
  unit?: "hours" | "percent"
  exception?: "warning" | "critical"
}

export interface DashboardAlert {
  id: string
  severity: "warning" | "critical"
  count: number
}

export interface InventorySummaryData {
  totalItems: number
  lowStockItems: number
}

export interface HomeDashboardViewData {
  role: DashboardRole
  metadata: DashboardMetadataDto
  metrics: DashboardMetric[]
  charts: DashboardStatsDto["charts"]
  recentWorkOrders: RecentWorkOrderDto[]
  topIncidentInstallations: TopIncidentInstallation[]
  upcomingPreventive: UpcomingPreventive[]
  alerts: DashboardAlert[]
  resourceMetrics: Array<{ id: "installations" | "assets" | "technicians" | "devices"; value: number }>
}

export interface HomeDashboardCache {
  cacheKey: string
  dashboard: DashboardStatsDto
  inventory: InventorySummaryData | null
}

export interface HomeDashboardState {
  data: HomeDashboardViewData | null
  inventory: InventorySummaryData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  inventoryError: boolean
  range: RangeOption
  isOffline: boolean
  isStale: boolean
  setRange: (range: RangeOption) => void
  retry: () => void
}

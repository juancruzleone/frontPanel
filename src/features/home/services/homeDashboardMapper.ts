import type {
  DashboardAlert,
  DashboardRole,
  DashboardScope,
  DashboardStatsDto,
  HomeDashboardViewData,
  UpcomingPreventive,
} from "../types/homeTypes"

const ROLE_SCOPES: Record<DashboardRole, DashboardScope> = {
  admin: "tenant",
  technician: "assigned_work",
  client: "assigned_installations",
}

export const normalizeDashboardRole = (role: string | null): DashboardRole | null => {
  if (role === "admin") return "admin"
  if (role === "tecnico" || role === "técnico") return "technician"
  if (role === "cliente") return "client"
  return null
}

export const expectedDashboardScope = (role: DashboardRole): DashboardScope => ROLE_SCOPES[role]

const normalizeUpcomingPreventive = (items: DashboardStatsDto["upcomingPreventive"]): UpcomingPreventive[] => (
  items.map((item) => ({
    _id: item._id,
    installationName: item.installationName ?? "",
    date: item.date ?? item.fechaProgramada ?? "",
    planName: item.planName ?? item.titulo ?? "",
  }))
)

export const mapDashboardStats = (
  dto: DashboardStatsDto,
  role: DashboardRole,
): HomeDashboardViewData => {
  const expectedScope = expectedDashboardScope(role)
  if (dto.metadata.scope !== expectedScope) {
    throw new Error("DASHBOARD_SCOPE_MISMATCH")
  }

  const operational = dto.operationalKpis ?? dto.kpis
  const alerts: DashboardAlert[] = []
  if (operational.overdueWorkOrders > 0) {
    alerts.push({ id: "overdue", severity: "critical", count: operational.overdueWorkOrders })
  }
  if (operational.criticalWorkOrders > 0) {
    alerts.push({ id: "critical", severity: "warning", count: operational.criticalWorkOrders })
  }

  const devices = dto.charts.deviceHealth.reduce((total, item) => total + item.value, 0)
  const resourceMetrics = role === "admin"
    ? [
        { id: "installations" as const, value: dto.kpis.installations },
        { id: "assets" as const, value: dto.kpis.assets },
        { id: "technicians" as const, value: dto.kpis.technicians },
      ]
    : role === "client"
      ? [
          { id: "installations" as const, value: dto.kpis.installations },
          { id: "devices" as const, value: devices },
        ]
      : []

  return {
    role,
    metadata: dto.metadata,
    metrics: [
      { id: "openWorkOrders", value: operational.openWorkOrders },
      { id: "overdueWorkOrders", value: operational.overdueWorkOrders, exception: operational.overdueWorkOrders > 0 ? "critical" : undefined },
      { id: "criticalWorkOrders", value: operational.criticalWorkOrders, exception: operational.criticalWorkOrders > 0 ? "warning" : undefined },
      { id: "mttrHours", value: operational.mttrHours, unit: "hours" },
      { id: "mtbfHours", value: operational.mtbfHours, unit: "hours" },
      { id: "preventiveComplianceRate", value: operational.preventiveComplianceRate, unit: "percent" },
      { id: "slaRate", value: operational.slaRate, unit: "percent" },
      { id: "responseTimeHours", value: operational.responseTimeHours, unit: "hours" },
    ],
    charts: dto.charts,
    recentWorkOrders: dto.recentWorkOrders,
    topIncidentInstallations: dto.topIncidentInstallations,
    upcomingPreventive: normalizeUpcomingPreventive(dto.upcomingPreventive),
    alerts,
    resourceMetrics,
  }
}

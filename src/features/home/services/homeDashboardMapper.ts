import type {
  DashboardAlert,
  DashboardMetricComparison,
  DashboardRole,
  DashboardScope,
  DashboardStatsDto,
  HomeDashboardViewData,
  UpcomingPreventive,
} from "../types/homeTypes"

type MetricPreference = "higher" | "lower" | "neutral"

const METRIC_PREFERENCES: Partial<Record<keyof DashboardStatsDto["operationalKpis"], MetricPreference>> = {
  overdueWorkOrders: "lower",
  criticalWorkOrders: "lower",
  mttrHours: "lower",
  mtbfHours: "higher",
  preventiveComplianceRate: "higher",
  slaRate: "higher",
  responseTimeHours: "lower",
}

const compareMetric = (
  current: number | null,
  previous: number | null | undefined,
  preference: MetricPreference,
): DashboardMetricComparison => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { status: "unavailable" }
  const delta = (current as number) - (previous as number)
  if (delta === 0) return { status: "available", direction: "unchanged", outcome: "unchanged", delta: 0 }

  const direction = delta > 0 ? "up" : "down"
  if (preference === "neutral") return { status: "available", direction, outcome: "changed", delta }
  const improved = (preference === "higher" && delta > 0) || (preference === "lower" && delta < 0)
  return { status: "available", direction, outcome: improved ? "improved" : "worsened", delta }
}

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
  clientsCount?: number,
): HomeDashboardViewData => {
  const expectedScope = expectedDashboardScope(role)
  if (dto.metadata.scope !== expectedScope) {
    throw new Error("DASHBOARD_SCOPE_MISMATCH")
  }

  const operational = dto.operationalKpis ?? dto.kpis
  const previous = dto.previousWindow.available ? dto.kpisPrevious : null
  const metric = <K extends keyof typeof operational>(
    id: K,
    options: Omit<HomeDashboardViewData["metrics"][number], "id" | "value" | "comparison"> = {},
  ): HomeDashboardViewData["metrics"][number] => ({
    id,
    value: operational[id],
    comparison: compareMetric(operational[id], previous?.[id], METRIC_PREFERENCES[id] ?? "neutral"),
    ...options,
  })
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
        ...(clientsCount !== undefined ? [{ id: "clients" as const, value: clientsCount }] : []),
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
      metric("openWorkOrders", { total: dto.kpis.workOrders }),
      metric("overdueWorkOrders", { total: dto.kpis.workOrders, exception: operational.overdueWorkOrders > 0 ? "critical" : undefined }),
      metric("criticalWorkOrders", { total: dto.kpis.workOrders, exception: operational.criticalWorkOrders > 0 ? "warning" : undefined }),
      metric("mttrHours", { unit: "hours" }),
      metric("mtbfHours", { unit: "hours" }),
      metric("preventiveComplianceRate", { unit: "percent" }),
      metric("slaRate", { unit: "percent" }),
      metric("responseTimeHours", { unit: "hours" }),
    ],
    charts: dto.charts,
    recentWorkOrders: dto.recentWorkOrders,
    topIncidentInstallations: dto.topIncidentInstallations,
    upcomingPreventive: normalizeUpcomingPreventive(dto.upcomingPreventive),
    alerts,
    resourceMetrics,
  }
}

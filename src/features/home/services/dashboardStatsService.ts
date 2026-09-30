import { fetchWithAuthRetry } from "../../../shared/utils/apiHeaders"
import type {
  ChartDataItem,
  DashboardComparisonKpisDto,
  DashboardKpisDto,
  DashboardMetadataDto,
  DashboardPreviousWindowDto,
  DashboardStatsDto,
  DashboardStatsResponse,
  EvolutionDataItem,
  OperationalKpisDto,
  RangeOption,
} from "../types/homeTypes"

const RANGE_OPTIONS = new Set<RangeOption>(["7d", "30d", "90d", "12m"])
const DASHBOARD_SCOPES = new Set(["tenant", "assigned_work", "assigned_installations"])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === "string"
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const isNullableNumber = (value: unknown): value is number | null => value === null || isFiniteNumber(value)
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || isString(value)

const hasOperationalKpis = (value: unknown): value is OperationalKpisDto => {
  if (!isRecord(value)) return false
  return isFiniteNumber(value.openWorkOrders)
    && isFiniteNumber(value.overdueWorkOrders)
    && isFiniteNumber(value.criticalWorkOrders)
    && isFiniteNumber(value.mttrHours)
    && isFiniteNumber(value.mtbfHours)
    && isNullableNumber(value.preventiveComplianceRate)
    && isNullableNumber(value.slaRate)
    && isNullableNumber(value.responseTimeHours)
}

const isDashboardKpis = (value: unknown): value is DashboardKpisDto => {
  if (!isRecord(value) || !hasOperationalKpis(value)) return false
  return isFiniteNumber(value.installations)
    && isFiniteNumber(value.assets)
    && isFiniteNumber(value.workOrders)
    && isFiniteNumber(value.technicians)
}

const isComparisonKpis = (value: unknown): value is DashboardComparisonKpisDto =>
  isRecord(value) && hasOperationalKpis(value) && isFiniteNumber(value.workOrders)

const isMetadata = (value: unknown): value is DashboardMetadataDto => {
  if (!isRecord(value)) return false
  return isString(value.lastUpdate)
    && isString(value.range) && RANGE_OPTIONS.has(value.range as RangeOption)
    && isString(value.scope) && DASHBOARD_SCOPES.has(value.scope)
    && typeof value.fallbackApplied === "boolean"
    && (value.suggestedStatusColors === undefined || (
      isRecord(value.suggestedStatusColors)
      && Object.values(value.suggestedStatusColors).every(isString)
    ))
}

const isPreviousWindow = (value: unknown): value is DashboardPreviousWindowDto => {
  if (!isRecord(value)) return false
  return isString(value.range) && RANGE_OPTIONS.has(value.range as RangeOption)
    && isString(value.start)
    && isString(value.end)
    && typeof value.available === "boolean"
}

const isChartItem = (value: unknown): value is ChartDataItem =>
  isRecord(value) && isString(value.name) && isFiniteNumber(value.value)
    && (value.color === undefined || isString(value.color))

const isEvolutionItem = (value: unknown): value is EvolutionDataItem =>
  isRecord(value) && isString(value.name) && isFiniteNumber(value.created) && isFiniteNumber(value.completed)

const isCharts = (value: unknown): value is DashboardStatsDto["charts"] => {
  if (!isRecord(value)) return false
  return ["byStatus", "byType", "byPriority", "preventiveVsCorrective", "deviceHealth"]
    .every((key) => Array.isArray(value[key]) && value[key].every(isChartItem))
    && Array.isArray(value.evolution) && value.evolution.every(isEvolutionItem)
}

const isRecentWorkOrder = (value: unknown): boolean => isRecord(value)
  && isString(value._id) && isString(value.titulo) && isString(value.estado)
  && isOptionalString(value.fechaCreacion)
  && (value.instalacion === undefined || (
    isRecord(value.instalacion) && isOptionalString(value.instalacion.company)
  ))

const isIncidentInstallation = (value: unknown): boolean => isRecord(value)
  && isString(value._id) && isString(value.name) && isFiniteNumber(value.count)

const isUpcomingPreventive = (value: unknown): boolean => isRecord(value)
  && isString(value._id)
  && ["installationName", "date", "planName", "fechaProgramada", "titulo"]
    .every((key) => isOptionalString(value[key]))

const isDashboardStats = (value: unknown): value is DashboardStatsDto => {
  if (!isRecord(value)) return false
  if (!isMetadata(value.metadata) || !isDashboardKpis(value.kpis)
    || !hasOperationalKpis(value.operationalKpis) || !isCharts(value.charts)) return false
  if (!Array.isArray(value.recentWorkOrders) || !value.recentWorkOrders.every(isRecentWorkOrder)
    || !Array.isArray(value.topIncidentInstallations) || !value.topIncidentInstallations.every(isIncidentInstallation)
    || !Array.isArray(value.upcomingPreventive) || !value.upcomingPreventive.every(isUpcomingPreventive)) return false
  if (!isPreviousWindow(value.previousWindow)) return false
  const comparisonValid = value.kpisPrevious === null || isComparisonKpis(value.kpisPrevious)
  return comparisonValid && value.previousWindow.available === (value.kpisPrevious !== null)
}

export const parseDashboardStatsResponse = (value: unknown): DashboardStatsResponse => {
  if (!isRecord(value) || value.success !== true || !isDashboardStats(value.data)) {
    throw new Error("DASHBOARD_PAYLOAD_INVALID")
  }
  return {
    success: true,
    data: value.data,
    message: isString(value.message) ? value.message : undefined,
  }
}

export const fetchDashboardStats = async (range: RangeOption): Promise<DashboardStatsResponse> => {
  const apiUrl = import.meta.env.VITE_API_URL || "/api/"
  const query = new URLSearchParams({ range, compare: "true" })
  const response = await fetchWithAuthRetry(`${apiUrl}dashboard/stats?${query.toString()}`)
  const payload: unknown = await response.json()

  if (!response.ok) {
    const message = isRecord(payload) && isString(payload.message) ? payload.message : "DASHBOARD_LOAD_FAILED"
    throw new Error(message)
  }
  return parseDashboardStatsResponse(payload)
}

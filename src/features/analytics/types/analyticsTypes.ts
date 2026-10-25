import type { RangeOption } from "../../home/types/homeTypes"

export type IndicatorId =
  | "mttr"
  | "mtbf"
  | "cumplimiento-preventivo"
  | "cumplimiento-sla"
  | "primera-respuesta"

export interface AnalyticsFilterState {
  range: RangeOption
  installationId: string
}

export interface IndicatorSummary {
  id: IndicatorId
  title: string
  shortTitle: string
  value: number | null
  unit: string
  formattedValue: string
  delta: number | null
  deltaDirection?: "up" | "down" | "unchanged"
  status: "available" | "insufficient_data" | "not_configured"
  statusMessage: string
  description: string
  formula: string
}

export interface MetricTrendPoint {
  date: string
  value: number
  target?: number
  label?: string
}

export interface BreakdownItem {
  id: string
  name: string
  value: number
  count: number
  percentage?: number
  target?: number
}

export interface ContributingRecord {
  id: string
  orderNumber?: string
  title: string
  installationName: string
  assetName?: string
  priority: string
  status: string
  date: string
  startDate?: string
  completionDate?: string
  calculatedValue: number | string
  duration?: string
  unit?: string
}

export interface IndicatorDetailMetrics {
  mainMetric: {
    label: string
    value: string
    subtitle: string
  }
  metric1: {
    label: string
    value: string | number
    subtitle: string
  }
  metric2: {
    label: string
    value: string | number
    subtitle: string
  }
}

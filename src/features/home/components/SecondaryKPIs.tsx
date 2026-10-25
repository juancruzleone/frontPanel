import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Clock, Activity, CalendarCheck, ShieldCheck, Zap, ArrowUpRight } from "lucide-react"
import type { DashboardMetric } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface SecondaryKPIsProps {
  metrics: DashboardMetric[]
}

const SECONDARY_METRIC_CONFIG = [
  { id: "mttrHours", icon: Clock, route: "/dashboard/indicadores/mttr" },
  { id: "mtbfHours", icon: Activity, route: "/dashboard/indicadores/mtbf" },
  { id: "preventiveComplianceRate", icon: CalendarCheck, route: "/dashboard/indicadores/cumplimiento-preventivo" },
  { id: "slaRate", icon: ShieldCheck, route: "/dashboard/indicadores/cumplimiento-sla" },
  { id: "responseTimeHours", icon: Zap, route: "/dashboard/indicadores/primera-respuesta" },
] as const

const formatMetricValue = (metric?: DashboardMetric): string => {
  if (!metric || metric.value === null || !Number.isFinite(metric.value)) {
    return "N/D"
  }
  // Para métricas de tiempo (MTTR, MTBF, Primera respuesta), 0 significa ausencia de datos registrados
  if ((metric.id === "mttrHours" || metric.id === "mtbfHours" || metric.id === "responseTimeHours") && metric.value <= 0) {
    return "N/D"
  }
  if (metric.unit === "hours") {
    return `${metric.value.toFixed(1)} h`
  }
  if (metric.unit === "percent") {
    return `${Math.round(metric.value)} %`
  }
  return String(Math.round(metric.value))
}

const formatMetricSub = (metric?: DashboardMetric, t?: (key: string, opts?: { defaultValue?: string; direction?: string; delta?: string }) => string): string => {
  const tr = t ?? ((k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? k)
  if (!metric || metric.value === null || !Number.isFinite(metric.value)) {
    return tr("home.dashboard.comparison.noData", { defaultValue: "Sin datos" })
  }
  if (metric.comparison.status === "available") {
    if (metric.comparison.outcome === "unchanged") {
      return tr("home.dashboard.comparison.unchanged", { defaultValue: "Sin cambios" })
    }
    const delta = Math.abs(metric.comparison.delta)
    const deltaStr = metric.unit === "hours" ? `${delta.toFixed(1)} h` : `${Math.round(delta)}%`
    const symbol = metric.comparison.direction === "up" ? "↑" : "↓"
    return tr("home.dashboard.comparison.vsPrevious", {
      direction: symbol,
      delta: deltaStr,
      defaultValue: `${symbol} ${deltaStr} vs anterior`,
    })
  }
  return tr("home.dashboard.comparison.unchanged", { defaultValue: "Sin cambios" })
}

const isAvailable = (metric: DashboardMetric): boolean =>
  metric.value !== null && Number.isFinite(metric.value)

export const SecondaryKPIs = ({ metrics }: SecondaryKPIsProps) => {
  const { t } = useTranslation()

  if (metrics.length > 0 && !metrics.some(isAvailable)) {
    return (
      <div className={styles.secondaryKpisSection} data-tour="home-dashboard-secondary-kpis">
        <h2 id="secondary-indicators-title" className={styles.sectionHeading}>
          {t("home.dashboard.sections.secondaryIndicators", { defaultValue: "Indicadores operativos secundarios" })}
        </h2>
        <p className={styles.emptyState}>{t("home.dashboard.empty.metrics")}</p>
      </div>
    )
  }

  return (
    <div className={styles.secondaryKpisSection} data-tour="home-dashboard-secondary-kpis">
      <h2 id="secondary-indicators-title" className={styles.sectionHeading}>
        {t("home.dashboard.sections.secondaryIndicators", { defaultValue: "Indicadores operativos secundarios" })}
      </h2>
      <div className={styles.secondaryKpisGrid}>
        {SECONDARY_METRIC_CONFIG.map(({ id, icon: Icon, route }) => {
          const metric = metrics.find((m) => m.id === id)
          const value = formatMetricValue(metric)
          const sub = formatMetricSub(metric, t)

          return (
            <Link key={id} to={route} className={styles.secondaryKpiCard}>
              <div className={styles.secondaryKpiHeader}>
                <Icon size={15} className={styles.secondaryKpiIcon} aria-hidden />
                <span className={styles.secondaryKpiTitle}>
                  {t(`home.dashboard.metrics.${id}`)}
                </span>
                <ArrowUpRight size={13} className={styles.kpiArrowIcon} aria-hidden="true" />
              </div>
              <div className={styles.secondaryKpiBody}>
                <span className={styles.secondaryKpiValue}>{value}</span>
                <span className={styles.secondaryKpiSub}>{sub}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

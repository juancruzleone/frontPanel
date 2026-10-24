import { useTranslation } from "react-i18next"
import { Clock, Activity, CalendarCheck, ShieldCheck, Zap } from "lucide-react"
import type { DashboardMetric } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface SecondaryKPIsProps {
  metrics: DashboardMetric[]
}

const SECONDARY_METRIC_CONFIG = [
  { id: "mttrHours", icon: Clock },
  { id: "mtbfHours", icon: Activity },
  { id: "preventiveComplianceRate", icon: CalendarCheck },
  { id: "slaRate", icon: ShieldCheck },
  { id: "responseTimeHours", icon: Zap },
] as const

const formatMetricValue = (metric?: DashboardMetric): string => {
  if (!metric || metric.value === null || !Number.isFinite(metric.value)) {
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

const formatMetricSub = (metric?: DashboardMetric): string => {
  if (!metric || metric.value === null || !Number.isFinite(metric.value)) {
    return "Sin datos"
  }
  if (metric.comparison.status === "available") {
    if (metric.comparison.outcome === "unchanged") {
      return "Sin cambios"
    }
    const delta = Math.abs(metric.comparison.delta)
    const deltaStr = metric.unit === "hours" ? `${delta.toFixed(1)} h` : `${Math.round(delta)}%`
    const symbol = metric.comparison.direction === "up" ? "↑" : "↓"
    return `${symbol} ${deltaStr} vs anterior`
  }
  return "Sin cambios"
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
        {SECONDARY_METRIC_CONFIG.map(({ id, icon: Icon }) => {
          const metric = metrics.find((m) => m.id === id)
          const value = formatMetricValue(metric)
          const sub = formatMetricSub(metric)

          return (
            <div key={id} className={styles.secondaryKpiCard}>
              <div className={styles.secondaryKpiHeader}>
                <Icon size={15} className={styles.secondaryKpiIcon} aria-hidden />
                <span className={styles.secondaryKpiTitle}>
                  {t(`home.dashboard.metrics.${id}`)}
                </span>
              </div>
              <div className={styles.secondaryKpiBody}>
                <span className={styles.secondaryKpiValue}>{value}</span>
                <span className={styles.secondaryKpiSub}>{sub}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

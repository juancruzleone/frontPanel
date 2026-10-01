import { useTranslation } from "react-i18next"
import type { DashboardMetric } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface OperationalKPIsProps {
  metrics: DashboardMetric[]
}

const formatMetric = (metric: DashboardMetric, notAvailable: string): string => {
  if (metric.value === null) return notAvailable
  const value = metric.unit === "hours" ? metric.value.toFixed(1) : Math.round(metric.value).toString()
  if (metric.unit === "hours") return `${value} h`
  if (metric.unit === "percent") return `${value} %`
  return value
}

const isAvailable = (metric: DashboardMetric): boolean =>
  metric.value !== null && Number.isFinite(metric.value)

const formatDelta = (metric: DashboardMetric): string => {
  if (metric.comparison.status === "unavailable") return ""
  const delta = Math.abs(metric.comparison.delta)
  if (metric.unit === "hours") return `${delta.toFixed(1)} h`
  if (metric.unit === "percent") return `${Math.round(delta)} pp`
  return Math.round(delta).toString()
}

const TREND_SYMBOLS = { up: "↑", down: "↓", unchanged: "→" } as const
const TREND_CLASSES = {
  improved: styles.trendImproved,
  worsened: styles.trendWorsened,
  unchanged: "",
  changed: "",
} as const

export const OperationalKPIs = ({ metrics }: OperationalKPIsProps) => {
  const { t } = useTranslation()

  // A band whose every metric came back unavailable is not eight zeros: it is
  // an account with nothing loaded yet. Say so instead of rendering "N/D".
  if (metrics.length > 0 && !metrics.some(isAvailable)) {
    return (
      <div className={`${styles.kpiBand} ${styles.kpiBandEmpty}`} role="group" aria-label={t("home.operationalMetrics")}>
        <p className={styles.emptyState}>{t("home.dashboard.empty.metrics")}</p>
      </div>
    )
  }

  return (
    <dl className={styles.kpiBand} aria-label={t("home.operationalMetrics")}>
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={`${styles.kpiCell} ${metric.exception ? styles[metric.exception] : ""}`}
        >
          <dt>{t(`home.dashboard.metrics.${metric.id}`)}</dt>
          <dd>
            {formatMetric(metric, t("common.notAvailable", { defaultValue: "N/D" }))}
            {metric.unit === "percent" && metric.value !== null && Number.isFinite(metric.value) && metric.value >= 0 && metric.value <= 100 && (
              <progress
                className={styles.kpiProgress}
                value={metric.value}
                max={100}
                aria-label={t(`home.dashboard.metrics.${metric.id}`)}
              />
            )}
            {metric.unit === "hours" && (
              <span className={styles.kpiDetail}>{t(`home.dashboard.metricDetails.${metric.id}`)}</span>
            )}
            {!metric.unit && metric.value !== null && metric.value >= 0 && Number.isFinite(metric.value)
              && metric.total !== undefined && Number.isFinite(metric.total) && metric.total > 0 && metric.value <= metric.total && (
                <span className={styles.kpiDetail}>{t("home.dashboard.metricDetails.proportion", { count: metric.value, total: metric.total })}</span>
              )}
            {metric.comparison.status === "available" ? (
              <span className={`${styles.kpiTrend} ${TREND_CLASSES[metric.comparison.outcome]}`}>
                {t("home.dashboard.comparison.change", {
                  direction: TREND_SYMBOLS[metric.comparison.direction],
                  value: formatDelta(metric),
                  outcome: t(`home.dashboard.comparison.${metric.comparison.outcome}`),
                })}
              </span>
            ) : (
              <span className={styles.kpiTrend}>{t("home.dashboard.comparison.unavailable")}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

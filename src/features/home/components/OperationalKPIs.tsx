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

export const OperationalKPIs = ({ metrics }: OperationalKPIsProps) => {
  const { t } = useTranslation()
  return (
    <dl className={styles.kpiBand} aria-label={t("home.operationalMetrics")}>
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={`${styles.kpiCell} ${metric.exception ? styles[metric.exception] : ""}`}
        >
          <dt>{t(`home.dashboard.metrics.${metric.id}`)}</dt>
          <dd>{formatMetric(metric, t("common.notAvailable", { defaultValue: "N/D" }))}</dd>
        </div>
      ))}
    </dl>
  )
}

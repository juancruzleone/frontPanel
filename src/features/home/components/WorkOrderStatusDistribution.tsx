import { useTranslation } from "react-i18next"
import type { ChartDataItem } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface WorkOrderStatusDistributionProps {
  data: ChartDataItem[]
  mode?: "status" | "priority"
}

const normalizeName = (name: string): string => {
  const normalized = name.toLocaleLowerCase().replace(/ /g, "_")
  const aliases: Record<string, string> = {
    pendiente: "pending", asignada: "assigned", en_progreso: "inProgress",
    completada: "completed", cancelada: "cancelled", baja: "low", media: "medium",
    alta: "high", critica: "critical",
  }
  return aliases[normalized] || name
}

export const WorkOrderStatusDistribution = ({ data, mode = "status" }: WorkOrderStatusDistributionProps) => {
  const { t } = useTranslation()
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const title = mode === "priority" ? t("home.byPriority") : t("home.ordersByStatus")

  return (
    <section className={styles.panel} aria-labelledby="distribution-title">
      <div className={styles.panelHeader}>
        <div><p className={styles.panelKicker}>{t("home.dashboard.distribution.kicker")}</p><h2 id="distribution-title">{title}</h2></div>
        <span className={styles.panelTotal}>{t("home.dashboard.ordersCount", { count: total })}</span>
      </div>
      {total === 0 ? (
        <p className={styles.emptyState}>{t("home.dashboard.empty.distribution")}</p>
      ) : (
        <>
          <div className={styles.stackedBar} aria-hidden="true">
            {data.map((item) => (
              <span
                key={item.name}
                className={`${styles.stackedSegment} ${styles[`segment${normalizeName(item.name)}`] || styles.segmentOther}`}
                data-size={Math.max(1, Math.round((item.value / total) * 10))}
              />
            ))}
          </div>
          <ul className={styles.distributionList}>
            {data.map((item) => {
              const key = normalizeName(item.name)
              const percentage = Math.round((item.value / total) * 100)
              return (
                <li key={item.name}>
                  <span className={`${styles.statusMarker} ${styles[`marker${key}`] || styles.markerOther}`} />
                  <span>{t(`home.${mode}.${key}`, { defaultValue: item.name })}</span>
                  <strong>{item.value}</strong>
                  <span>{percentage}%</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

import { useTranslation } from "react-i18next"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import type { DashboardAlert, TopIncidentInstallation, UpcomingPreventive } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface AttentionRequiredProps {
  alerts: DashboardAlert[]
  incidents: TopIncidentInstallation[]
  maintenance: UpcomingPreventive[]
  showInstallations: boolean
}

export const AttentionRequired = ({ alerts, incidents, maintenance, showInstallations }: AttentionRequiredProps) => {
  const { t, i18n } = useTranslation()
  const formatMaintenanceDate = (value: string) => formatDateSafely(
    value,
    i18n.resolvedLanguage || "es",
    { dateStyle: "medium" },
    t("home.dashboard.dateUnavailable"),
  )

  return (
    <aside className={`${styles.panel} ${styles.attentionPanel}`} aria-labelledby="attention-title">
      <div className={styles.panelHeader}>
        <div><p className={styles.panelKicker}>{t("home.dashboard.attention.kicker")}</p><h2 id="attention-title">{t("home.dashboard.attention.title")}</h2></div>
      </div>
      {alerts.length === 0 ? (
        <p className={styles.attentionClear}>{t("home.dashboard.attention.clear")}</p>
      ) : (
        <ul className={styles.alertList}>
          {alerts.map((alert) => (
            <li key={alert.id} className={styles[alert.severity]}>
              <strong>{alert.count}</strong>
              <span>{t(`home.dashboard.attention.${alert.id}`, { count: alert.count })}</span>
            </li>
          ))}
        </ul>
      )}
      {showInstallations && incidents.length > 0 && (
        <div className={styles.secondaryList}>
          <h3>{t("home.topIncidentInstallations")}</h3>
          <ol>{incidents.slice(0, 3).map((item) => <li key={item._id}><span>{item.name}</span><strong>{item.count}</strong></li>)}</ol>
        </div>
      )}
      {maintenance.length > 0 && (
        <div className={styles.secondaryList}>
          <h3>{t("home.upcomingPreventive")}</h3>
          <ul>{maintenance.slice(0, 3).map((item) => (
            <li key={item._id}>
              <span>{item.installationName || t("workOrders.noInstallation")}</span>
               <time dateTime={item.date}>{formatMaintenanceDate(item.date)}</time>
            </li>
          ))}</ul>
        </div>
      )}
    </aside>
  )
}

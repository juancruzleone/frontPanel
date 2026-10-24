import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import type { DashboardAlert, TopIncidentInstallation, UpcomingPreventive } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface AttentionRequiredProps {
  alerts: DashboardAlert[]
  incidents: TopIncidentInstallation[]
  maintenance: UpcomingPreventive[]
  showInstallations: boolean
}

export const AttentionRequired = ({ alerts }: AttentionRequiredProps) => {
  const { t } = useTranslation()

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
    </aside>
  )
}

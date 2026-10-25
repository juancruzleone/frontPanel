import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import type { TopIncidentInstallation } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface IncidentInstallationsPanelProps {
  incidents: TopIncidentInstallation[]
}

export const IncidentInstallationsPanel = ({ incidents }: IncidentInstallationsPanelProps) => {
  const { t } = useTranslation()
  const { getRoute } = useTranslatedRoutes()

  if (incidents.length === 0) {
    return null
  }

  return (
    <section className={`${styles.panel} ${styles.incidentsPanel}`} aria-labelledby="incidents-panel-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>{t("home.dashboard.attention.kicker", { defaultValue: "Atención" })}</p>
          <h2 id="incidents-panel-title">{t("home.topIncidentInstallations", { defaultValue: "Instalaciones con más Incidentes" })}</h2>
        </div>
        <Link to={getRoute("installations")} className={styles.viewAllActionBtn}>
          <span>{t("common.viewAllFeminine", { defaultValue: "Ver todas" })}</span>
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>

      <div className={styles.incidentsListContainer}>
        <div className={styles.incidentsColHeader}>
          <span>{t("home.dashboard.table.installation", { defaultValue: "Instalación" })}</span>
          <span>{t("home.dashboard.attention.incidentsLabel", { defaultValue: "Incidentes" })}</span>
        </div>
        <ol className={styles.incidentsList}>
          {incidents.slice(0, 5).map((item) => (
            <li key={item._id} className={styles.incidentItem}>
              <Link
                className={styles.incidentLink}
                to={getRoute("installations", { id: item._id })}
              >
                <span className={styles.incidentName} title={item.name}>
                  {item.name}
                </span>
                <span className={styles.incidentCountPill}>
                  <span className={styles.incidentSeverityDot} aria-hidden />
                  <strong>{item.count}</strong>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

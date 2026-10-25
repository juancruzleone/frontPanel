import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import { translateWorkOrderTitle } from "../../../shared/utils/backendTranslations"
import type { RecentWorkOrderDto, UpcomingPreventive } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface UpcomingPreventiveTableProps {
  maintenance: UpcomingPreventive[]
  onOpenDetail?: (order: RecentWorkOrderDto, trigger: HTMLElement) => void
}

export const UpcomingPreventiveTable = ({ maintenance, onOpenDetail }: UpcomingPreventiveTableProps) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { getRoute } = useTranslatedRoutes()

  const formatMaintenanceDate = (value: string) =>
    formatDateSafely(
      value,
      i18n.resolvedLanguage || "es",
      { day: "2-digit", month: "short", year: "numeric" },
      t("home.dashboard.dateUnavailable"),
    )

  if (maintenance.length === 0) {
    return null
  }

  return (
    <div className={styles.preventiveFullSection} data-tour="home-dashboard-maintenance-schedule">
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>{t("home.dashboard.attention.kicker", { defaultValue: "Programación" })}</p>
            <h2 id="preventive-schedule-title">{t("home.upcomingPreventive")}</h2>
          </div>
          <button
            type="button"
            className={styles.viewAllActionBtn}
            onClick={() => navigate(getRoute("maintenancePlan"))}
          >
            <span>{t("common.viewAll", { defaultValue: "Ver todo" })}</span>
            <ArrowRight size={17} aria-hidden />
          </button>
        </div>

        <div className={styles.maintenanceTableContainer}>
          <table className={styles.maintenanceTable}>
            <thead>
              <tr>
                <th scope="col" className={styles.thPlan}>
                  {t("home.dashboard.table.assetOrPlan", { defaultValue: "Activo / Plan" })}
                </th>
                <th scope="col" className={styles.thInstallation}>
                  {t("home.dashboard.table.installation", { defaultValue: "Instalación" })}
                </th>
                <th scope="col" className={styles.thType}>
                  {t("home.dashboard.table.type", { defaultValue: "Tipo" })}
                </th>
                <th scope="col" className={styles.thDate}>
                  {t("home.dashboard.table.date", { defaultValue: "Fecha" })}
                </th>
                <th scope="col" className={styles.thStatus}>
                  {t("home.dashboard.table.status", { defaultValue: "Estado" })}
                </th>
                <th scope="col" className={styles.thActions} aria-label={t("home.dashboard.table.actions", { defaultValue: "Acciones" })}></th>
              </tr>
            </thead>
            <tbody>
              {maintenance.slice(0, 6).map((item, index) => {
                const rawTitle = item.planName || item.installationName || t("workOrders.noInstallation")
                const title = translateWorkOrderTitle(rawTitle)
                const isSoon = index < 2
                return (
                  <tr key={item._id || index} className={styles.maintenanceTableRow}>
                    <td className={styles.tdPlan} title={title}>
                      <span className={styles.planNameText}>{title}</span>
                    </td>
                    <td className={styles.tdInstallation} title={item.installationName}>
                      <span className={styles.installationText}>{item.installationName || "—"}</span>
                    </td>
                    <td className={styles.tdType}>
                      <span className={styles.typeText}>{t("home.type.preventive", { defaultValue: "Preventivo" })}</span>
                    </td>
                    <td className={styles.tdDate}>
                      <time dateTime={item.date} className={styles.dateText}>
                        {formatMaintenanceDate(item.date)}
                      </time>
                    </td>
                    <td className={styles.tdStatus}>
                      <span className={styles.statusBadgeSober}>
                        <span
                          className={`${styles.statusDotSober} ${isSoon ? styles.statusDotSoon : styles.statusDotScheduled}`}
                          aria-hidden
                        />
                        <span>{isSoon ? t("home.dashboard.upcoming.soon", { defaultValue: "Próximo" }) : t("home.dashboard.upcoming.scheduled", { defaultValue: "Programado" })}</span>
                      </span>
                    </td>
                    <td className={styles.tdActions}>
                      <button
                        type="button"
                        className={styles.tableActionBtn}
                        onClick={(e) => {
                          if (onOpenDetail) {
                            onOpenDetail(
                              {
                                _id: item._id,
                                titulo: title,
                                estado: "programado",
                                instalacion: { company: item.installationName },
                              },
                              e.currentTarget,
                            )
                          } else {
                            navigate(getRoute("maintenancePlan"))
                          }
                        }}
                        aria-label={t("common.details", { defaultValue: "Ver detalle" })}
                        title={t("common.details", { defaultValue: "Ver detalle" })}
                      >
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

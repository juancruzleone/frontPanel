import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { FileText, AlertTriangle, Calendar, Package, ArrowRight } from "lucide-react"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import type { DashboardMetric } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface PrimaryKPIsProps {
  metrics: DashboardMetric[]
  upcomingCount: number
  assetsCount: number
}

const TREND_SYMBOLS = { up: "↑", down: "↓", unchanged: "→" } as const

export const PrimaryKPIs = ({ metrics, upcomingCount, assetsCount }: PrimaryKPIsProps) => {
  const { t } = useTranslation()
  const { getRoute } = useTranslatedRoutes()

  const openOrders = metrics.find((m) => m.id === "openWorkOrders")
  const overdueOrders = metrics.find((m) => m.id === "overdueWorkOrders")
  const openValue = openOrders?.value ?? 0
  const overdueValue = overdueOrders?.value ?? 0

  let comparisonText = ""
  if (openOrders?.comparison.status === "available") {
    const direction = TREND_SYMBOLS[openOrders.comparison.direction]
    const delta = Math.abs(openOrders.comparison.delta)
    comparisonText = `${direction} ${delta} menos que el período anterior`
  }

  return (
    <div className={styles.primaryKpisSection} data-tour="home-dashboard-primary-kpis">
      <h2 id="attention-overview-title" className={styles.sectionHeading}>
        {t("home.dashboard.sections.primaryKpis", { defaultValue: "Métricas principales" })}
      </h2>
      <div className={styles.primaryKpisGrid}>
        {/* Card 1: Órdenes abiertas */}
        <Link to={getRoute("workOrders")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <FileText size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.metrics.openWorkOrders", { defaultValue: "Órdenes abiertas" })}
            </span>
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{openValue}</span>
            {comparisonText && <span className={styles.primaryKpiSub}>{comparisonText}</span>}
          </div>
        </Link>

        {/* Card 2: Órdenes vencidas */}
        <Link
          to={getRoute("workOrders")}
          className={`${styles.primaryKpiCard} ${overdueValue > 0 ? styles.primaryKpiCardAlert : ""}`}
        >
          <div className={styles.primaryKpiHeader}>
            <AlertTriangle size={17} className={`${styles.primaryKpiIcon} ${overdueValue > 0 ? styles.kpiIconCritical : ""}`} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.metrics.overdueWorkOrders", { defaultValue: "Órdenes vencidas" })}
            </span>
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={`${styles.primaryKpiValue} ${overdueValue > 0 ? styles.kpiValueCritical : ""}`}>
              {overdueValue}
            </span>
            <span className={styles.primaryKpiSub}>
              {t("home.dashboard.attention.overdueSubtitle", { defaultValue: "Requieren atención" })}
            </span>
          </div>
        </Link>

        {/* Card 3: Próximos mantenimientos */}
        <Link to={getRoute("maintenancePlan")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <Calendar size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.upcomingMaintenanceTitle", { defaultValue: "Próximos mantenimientos" })}
            </span>
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{upcomingCount}</span>
            <span className={styles.primaryKpiSub}>
              {t("home.dashboard.scheduledSubtitle", { defaultValue: "Programados" })}
            </span>
          </div>
        </Link>

        {/* Card 4: Activos registrados */}
        <Link to={getRoute("assets")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <Package size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.registeredAssetsTitle", { defaultValue: "Activos registrados" })}
            </span>
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{assetsCount}</span>
            <span className={styles.primaryKpiSub}>
              {t("home.dashboard.organizationTotal", { defaultValue: "Total de la organización" })}
            </span>
          </div>
        </Link>
      </div>

      {/* Alerta de órdenes vencidas si hay al menos una */}
      {overdueValue > 0 && (
        <div className={styles.overdueAlertBanner}>
          <div className={styles.overdueAlertLeft}>
            <AlertTriangle size={18} className={styles.overdueAlertIcon} aria-hidden />
            <div className={styles.overdueAlertText}>
              <strong>
                {t("home.dashboard.overdueAlert.title", {
                  count: overdueValue,
                  defaultValue: `${overdueValue} órdenes requieren atención`,
                })}
              </strong>
              <p>
                {t("home.dashboard.overdueAlert.desc", {
                  count: overdueValue,
                  defaultValue: `Hay ${overdueValue} órdenes vencidas que necesitan ser resueltas.`,
                })}
              </p>
            </div>
          </div>
          <Link to={getRoute("workOrders")} className={styles.overdueAlertAction}>
            <span>{t("home.dashboard.overdueAlert.action", { defaultValue: "Ver órdenes vencidas" })}</span>
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  )
}

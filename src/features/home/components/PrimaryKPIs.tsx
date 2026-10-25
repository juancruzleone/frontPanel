import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { FileText, AlertTriangle, Calendar, Package, ArrowUpRight } from "lucide-react"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import type { DashboardMetric } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface PrimaryKPIsProps {
  metrics: DashboardMetric[]
  upcomingCount: number
  assetsCount: number
  isClient?: boolean
}

const TREND_SYMBOLS = { up: "↑", down: "↓", unchanged: "→" } as const

export const PrimaryKPIs = ({ metrics, upcomingCount, assetsCount, isClient = false }: PrimaryKPIsProps) => {
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
    if (openOrders.comparison.direction === "up") {
      comparisonText = t("home.dashboard.comparison.moreThanPrevious", {
        direction,
        count: delta,
        defaultValue: `${direction} ${delta} más que el período anterior`,
      })
    } else {
      comparisonText = t("home.dashboard.comparison.lessThanPrevious", {
        direction,
        count: delta,
        defaultValue: `${direction} ${delta} menos que el período anterior`,
      })
    }
  }

  return (
    <div className={styles.primaryKpisSection} data-tour="home-dashboard-primary-kpis">
      <h2 id="attention-overview-title" className={styles.sectionHeading}>
        {t("home.dashboard.sections.primaryKpis", { defaultValue: "Métricas principales" })}
      </h2>
      <div className={`${styles.primaryKpisGrid} ${isClient ? styles.clientKpisGrid : ""}`}>
        {/* Card 1: Órdenes abiertas */}
        <Link to={getRoute("workOrders")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <FileText size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.metrics.openWorkOrders", { defaultValue: "Órdenes abiertas" })}
            </span>
            <ArrowUpRight size={14} className={styles.kpiArrowIcon} aria-hidden="true" />
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{openValue}</span>
            {comparisonText && <span className={styles.primaryKpiSub}>{comparisonText}</span>}
          </div>
        </Link>

        {/* Card 2: Órdenes vencidas */}
        <Link
          to={`${getRoute("workOrders")}?estado=vencida`}
          className={`${styles.primaryKpiCard} ${overdueValue > 0 ? styles.primaryKpiCardAlert : ""}`}
        >
          <div className={styles.primaryKpiHeader}>
            <AlertTriangle size={17} className={`${styles.primaryKpiIcon} ${overdueValue > 0 ? styles.kpiIconCritical : ""}`} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.metrics.overdueWorkOrders", { defaultValue: "Órdenes vencidas" })}
            </span>
            <ArrowUpRight size={14} className={styles.kpiArrowIcon} aria-hidden="true" />
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

        {/* Card 3: Próximos mantenimientos (el cliente no tiene plan: va al calendario) */}
        <Link to={isClient ? getRoute("calendar") : getRoute("maintenancePlan")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <Calendar size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.upcomingMaintenanceTitle", { defaultValue: "Próximos mantenimientos" })}
            </span>
            <ArrowUpRight size={14} className={styles.kpiArrowIcon} aria-hidden="true" />
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{upcomingCount}</span>
            <span className={styles.primaryKpiSub}>
              {t("home.dashboard.scheduledSubtitle", { defaultValue: "Programados" })}
            </span>
          </div>
        </Link>

        {/* Card 4: Activos registrados (oculta para el cliente) */}
        {!isClient && (
        <Link to={getRoute("assets")} className={styles.primaryKpiCard}>
          <div className={styles.primaryKpiHeader}>
            <Package size={17} className={styles.primaryKpiIcon} aria-hidden />
            <span className={styles.primaryKpiTitle}>
              {t("home.dashboard.registeredAssetsTitle", { defaultValue: "Activos registrados" })}
            </span>
            <ArrowUpRight size={14} className={styles.kpiArrowIcon} aria-hidden="true" />
          </div>
          <div className={styles.primaryKpiBody}>
            <span className={styles.primaryKpiValue}>{assetsCount}</span>
            <span className={styles.primaryKpiSub}>
              {t("home.dashboard.organizationTotal", { defaultValue: "Total de la organización" })}
            </span>
          </div>
        </Link>
        )}
      </div>
    </div>
  )
}

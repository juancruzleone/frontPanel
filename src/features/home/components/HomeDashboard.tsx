import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { useAuthStore } from "../../../store/authStore"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import TourButton from "../../../shared/components/Buttons/TourButton"
import { useHomeDashboard } from "../hooks/useHomeDashboard"
import { useHomeTour } from "../hooks/useHomeTour"
import { AttentionRequired } from "./AttentionRequired"
import { DashboardHeader } from "./DashboardHeader"
import { InventorySummary } from "./InventoryAlerts"
import { LineChart } from "./LineChart"
import { OperationalKPIs } from "./OperationalKPIs"
import { RecentWorkOrders } from "./RecentWorkOrders"
import { WorkOrderStatusDistribution } from "./WorkOrderStatusDistribution"
import styles from "../styles/home.module.css"

export const HomeDashboard = () => {
  const { t } = useTranslation()
  const rawRole = useAuthStore((state) => state.role)
  const permissions = useAuthStore((state) => state.permissions)
  const { getRoute } = useTranslatedRoutes()
  const { startTour } = useHomeTour()
  const dashboard = useHomeDashboard()

  if (dashboard.loading) return <DashboardSkeleton refreshing={dashboard.refreshing} />
  if (dashboard.error || !dashboard.data) {
    return (
      <div className={styles.dashboardContainer}>
        <section className={styles.fullError} role="alert">
          <h1>{t("home.dashboard.errors.title")}</h1>
          <p>{t(dashboard.error || "home.dashboard.errors.loadFailed")}</p>
          <button type="button" onClick={dashboard.retry}>{t("common.retry")}</button>
        </section>
      </div>
    )
  }

  const { data } = dashboard
  const distributionMode = data.role === "technician" ? "priority" : "status"
  const distributionData = distributionMode === "priority" ? data.charts.byPriority : data.charts.byStatus
  const technicianCanViewWorkOrders = data.role === "technician" && (
    permissions === null
    || (Array.isArray(permissions) ? permissions.includes("canViewWorkOrders") : permissions.canViewWorkOrders !== false)
  )
  const showWorkOrdersLink = data.role === "admin" || technicianCanViewWorkOrders

  return (
    <div className={styles.dashboardContainer}>
        <DashboardHeader
          role={data.role}
          metadata={data.metadata}
          range={data.metadata.range}
          onRangeChange={dashboard.setRange}
          secondaryAction={rawRole === "admin" ? <TourButton inline onClick={startTour} label={t("home.tour.buttons.restart")} /> : undefined}
        />
        {(dashboard.isOffline || dashboard.isStale || data.metadata.fallbackApplied) && (
          <div className={styles.dataNotices} role="status">
            {dashboard.isOffline && <p>{t("home.dashboard.notices.offline")}</p>}
            {dashboard.isStale && <p>{t("home.dashboard.notices.stale")}</p>}
            {data.metadata.fallbackApplied && <p>{t("home.dashboard.notices.fallback")}</p>}
          </div>
        )}

        <section aria-labelledby="attention-overview-title">
          <h2 id="attention-overview-title" className={styles.sectionHeading}>{t("home.dashboard.sections.immediate")}</h2>
          <div className={styles.attentionGrid}>
            <OperationalKPIs metrics={data.metrics} />
            <AttentionRequired
              alerts={data.alerts}
              incidents={data.topIncidentInstallations}
              maintenance={data.upcomingPreventive}
              showInstallations={data.role === "admin" || data.role === "client"}
            />
          </div>
        </section>

        {data.resourceMetrics.length > 0 && (
          <section className={styles.resourceBand} aria-labelledby="resources-title">
            <div><p className={styles.panelKicker}>{t("home.dashboard.resources.kicker")}</p><h2 id="resources-title">{t(`home.dashboard.resources.${data.role}`)}</h2></div>
            <dl>{data.resourceMetrics.map((metric) => <div key={metric.id}><dt>{t(`home.dashboard.resources.metrics.${metric.id}`)}</dt><dd>{metric.value}</dd></div>)}</dl>
          </section>
        )}

        <section aria-labelledby="analysis-title">
          <h2 id="analysis-title" className={styles.sectionHeading}>{t("home.dashboard.sections.analysis")}</h2>
          <div className={styles.analysisGrid}>
            <LineChart data={data.charts.evolution} />
            <WorkOrderStatusDistribution data={distributionData} mode={distributionMode} />
          </div>
        </section>

        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className={styles.sectionHeading}>{t("home.dashboard.sections.recent")}</h2>
          <div className={styles.workGrid}>
            <section className={styles.panel} aria-labelledby="recent-orders-title">
              <div className={styles.panelHeader}>
                <div><p className={styles.panelKicker}>{t("home.dashboard.recent.kicker")}</p><h2 id="recent-orders-title">{t("home.recentOrders")}</h2></div>
                {showWorkOrdersLink && <Link className={styles.panelAction} to={getRoute("workOrders")}>{t("nav.workOrdersList")}</Link>}
              </div>
              <RecentWorkOrders workOrders={data.recentWorkOrders} />
            </section>
            {data.role === "admin" ? <InventorySummary data={dashboard.inventory} hasError={dashboard.inventoryError} /> : (
              <section className={styles.panel} aria-labelledby="context-title">
                <div className={styles.panelHeader}><div><p className={styles.panelKicker}>{t("home.dashboard.context.kicker")}</p><h2 id="context-title">{t(`home.dashboard.context.${data.role}`)}</h2></div></div>
                <p className={styles.contextCopy}>{t(`home.dashboard.context.${data.role}Description`)}</p>
              </section>
            )}
          </div>
        </section>
    </div>
  )
}

interface DashboardSkeletonProps {
  refreshing: boolean
}

const DashboardSkeleton = ({ refreshing }: DashboardSkeletonProps) => {
  const { t } = useTranslation()

  return (
    <section
      className={styles.dashboardContainer}
      aria-busy="true"
      aria-label={t("home.dashboard.loading")}
      data-refreshing={refreshing || undefined}
    >
      <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />
      <div className={`${styles.skeleton} ${styles.skeletonKpis}`} />
      <div className={styles.analysisGrid}><div className={`${styles.skeleton} ${styles.skeletonTrend}`} /><div className={`${styles.skeleton} ${styles.skeletonDistribution}`} /></div>
      <div className={styles.workGrid}><div className={`${styles.skeleton} ${styles.skeletonWork}`} /><div className={`${styles.skeleton} ${styles.skeletonAttention}`} /></div>
    </section>
  )
}

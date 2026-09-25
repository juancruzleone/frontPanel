import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { useAuthStore } from "../../../store/authStore"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import TourButton from "../../../shared/components/Buttons/TourButton"
import { useHomeDashboard } from "../hooks/useHomeDashboard"
import { useHomeTour } from "../hooks/useHomeTour"
import { useWorkOrderDetail } from "../hooks/useWorkOrderDetail"
import { expectedDashboardScope, normalizeDashboardRole } from "../services/homeDashboardMapper"
import type { DashboardRole } from "../types/homeTypes"
import { AttentionRequired } from "./AttentionRequired"
import { DashboardHeader } from "./DashboardHeader"
import { InventorySummary } from "./InventoryAlerts"
import { LineChart } from "./LineChart"
import { OperationalKPIs } from "./OperationalKPIs"
import { RecentWorkOrders } from "./RecentWorkOrders"
import { WorkOrderDetailDialog } from "./WorkOrderDetailDialog"
import { WorkOrderStatusDistribution } from "./WorkOrderStatusDistribution"
import styles from "../styles/home.module.css"

export const HomeDashboard = () => {
  const { t } = useTranslation()
  const rawRole = useAuthStore((state) => state.role)
  const permissions = useAuthStore((state) => state.permissions)
  const { getRoute } = useTranslatedRoutes()
  const { startTour } = useHomeTour()
  const dashboard = useHomeDashboard()
  const workOrderDetail = useWorkOrderDetail()

  const tourButton = rawRole === "admin" ? <TourButton onClick={startTour} label={t("home.tour.buttons.restart")} /> : null
  const role = dashboard.data?.role ?? normalizeDashboardRole(rawRole)
  const header = role ? (
    <DashboardHeader
      role={role}
      metadata={dashboard.data?.metadata ?? {
        scope: expectedDashboardScope(role), range: dashboard.range, lastUpdate: "", fallbackApplied: false,
      }}
      loading={!dashboard.data}
      range={dashboard.range}
      onRangeChange={dashboard.setRange}
    />
  ) : <div className={`${styles.skeleton} ${styles.skeletonHeader}`} aria-hidden="true" />
  const notices = (dashboard.isOffline || dashboard.isStale || dashboard.data?.metadata.fallbackApplied) && (
    <div className={styles.dataNotices} role="status">
      {dashboard.isOffline && <p>{t("home.dashboard.notices.offline")}</p>}
      {dashboard.isStale && <p>{t("home.dashboard.notices.stale")}</p>}
      {dashboard.data?.metadata.fallbackApplied && <p>{t("home.dashboard.notices.fallback")}</p>}
    </div>
  )

  if (dashboard.loading && !dashboard.data) return <><DashboardSkeleton role={role} header={header} notices={notices} />{tourButton}</>
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
    <>
      <div className={styles.dashboardContainer} aria-busy={dashboard.refreshing} data-refreshing={dashboard.refreshing}>
        {header}
        <div className={styles.refreshStatus} role="status">
          {dashboard.refreshing && t("home.dashboard.refreshing", { range: t(`home.range.${data.metadata.range}`) })}
        </div>
        {notices}

        <section aria-labelledby="attention-overview-title">
          <ImmediateSectionHeading />
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
            <dl>{data.resourceMetrics.map((metric) => {
              const label = t(`home.dashboard.resources.metrics.${metric.id}`)
              const route = metric.id === "devices" ? null : getRoute(metric.id === "technicians" ? "personal" : metric.id)
              return (
                <div key={metric.id}>
                  <dt>{route ? <Link className={styles.resourceLink} to={route}>{label}</Link> : label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              )
            })}</dl>
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
              <RecentWorkOrders workOrders={data.recentWorkOrders} onOpenDetail={workOrderDetail.openWorkOrder} />
              {workOrderDetail.status === "loading" && (
                <p className={styles.orderFeedback} role="status">{t("home.dashboard.recent.detailLoading")}</p>
              )}
              {workOrderDetail.status === "error" && (
                <p className={styles.orderFeedback} role="alert">
                  {t("home.dashboard.recent.detailError")}
                  <button type="button" className={styles.orderFeedbackAction} onClick={workOrderDetail.retryWorkOrder}>
                    {t("common.retry")}
                  </button>
                </p>
              )}
            </section>
            {data.role === "admin" ? <InventorySummary data={dashboard.inventory} hasError={dashboard.inventoryError} onRetry={dashboard.retry} retrying={dashboard.refreshing} /> : (
              <section className={styles.panel} aria-labelledby="context-title">
                <div className={styles.panelHeader}><div><p className={styles.panelKicker}>{t("home.dashboard.context.kicker")}</p><h2 id="context-title">{t(`home.dashboard.context.${data.role}`)}</h2></div></div>
                <p className={styles.contextCopy}>{t(`home.dashboard.context.${data.role}Description`)}</p>
              </section>
            )}
          </div>
        </section>
      </div>
      {/* One dialog instance for the whole dashboard, driven by a single id. */}
      <WorkOrderDetailDialog workOrder={workOrderDetail.workOrder} onRequestClose={workOrderDetail.closeWorkOrder} />
      {tourButton}
    </>
  )
}

const ImmediateSectionHeading = () => {
  const { t } = useTranslation()
  return (
    <header className={styles.sectionHeader}>
      <p className={styles.eyebrow}>{t("home.dashboard.sections.immediateKicker")}</p>
      <h2 id="attention-overview-title" className={styles.sectionHeading}>{t("home.dashboard.sections.immediate")}</h2>
    </header>
  )
}

interface DashboardSkeletonProps {
  role: DashboardRole | null
  header: ReactNode
  notices: ReactNode
}

const DashboardSkeleton = ({ role, header, notices }: DashboardSkeletonProps) => {
  const { t } = useTranslation()
  const resources = role === "admin" ? ["installations", "assets", "technicians", "clients"] : role === "client" ? ["installations", "devices"] : []

  return (
    <div
      className={styles.dashboardContainer}
      aria-busy="true"
      data-refreshing="false"
      aria-label={t("home.dashboard.loading")}
    >
      {header}
      <div className={styles.refreshStatus} role="status" />
      {notices}
      <section aria-labelledby="attention-overview-title">
        <ImmediateSectionHeading />
        <div className={styles.attentionGrid} aria-hidden="true">
          <div className={`${styles.kpiBand} ${styles.skeletonKpis}`}>
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className={styles.kpiCell}><span className={`${styles.skeleton} ${styles.skeletonMetric}`} /></div>
            ))}
          </div>
          <div className={`${styles.skeleton} ${styles.attentionPanel} ${styles.skeletonAttention}`} />
        </div>
      </section>
      {resources.length > 0 && (
        <section className={styles.resourceBand} aria-labelledby="resources-title">
          <div><p className={styles.panelKicker}>{t("home.dashboard.resources.kicker")}</p><h2 id="resources-title">{t(`home.dashboard.resources.${role}`)}</h2></div>
          <dl>{resources.map((id) => (
            <div key={id}><dt>{t(`home.dashboard.resources.metrics.${id}`)}</dt><dd><span className={`${styles.skeleton} ${styles.skeletonValue}`} aria-hidden="true">&nbsp;</span></dd></div>
          ))}</dl>
        </section>
      )}
      <section aria-labelledby="analysis-title">
        <h2 id="analysis-title" className={styles.sectionHeading}>{t("home.dashboard.sections.analysis")}</h2>
        <div className={styles.analysisGrid} aria-hidden="true">
          <div className={`${styles.skeleton} ${styles.skeletonTrend}`} />
          <div className={`${styles.skeleton} ${styles.skeletonDistribution}`} />
        </div>
      </section>
      <section aria-labelledby="recent-title">
        <h2 id="recent-title" className={styles.sectionHeading}>{t("home.dashboard.sections.recent")}</h2>
        <div className={styles.workGrid} aria-hidden="true">
          <div className={`${styles.skeleton} ${styles.skeletonWork}`} />
          <div className={`${styles.skeleton} ${styles.skeletonContext}`} />
        </div>
      </section>
    </div>
  )
}

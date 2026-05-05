import React from "react"
import RecentWorkOrders from "./RecentWorkOrders"
import OperationalKPIs from "./OperationalKPIs"
import RangeFilter from "./RangeFilter"
import CustomLineChart from "./LineChart"
import CustomPieChart from "./PieChart"
import { InventoryAlerts } from "./InventoryAlerts"
import useHomeDashboard from "../hooks/useHomeDashboard"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"

const HomeDashboard: React.FC = () => {
  const { t } = useTranslation()
  const {
    range,
    setRange,
    operationalKpis,
    lineChartData,
    pieChartData,
    recentWorkOrders = [],
    inventoryStats = [],
    alerts = [],
    loading,
    error,
  } = useHomeDashboard()

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderContent}>
          <div>
            <h1 className={styles.title}>{t('home.title')}</h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
          </div>
          <RangeFilter current={range} onChange={setRange} />
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={`${styles.skeletonGrid} ${styles.skeletonChartsGrid}`}>
            <div className={`${styles.skeleton} ${styles.skeletonChart}`} />
            <div className={`${styles.skeleton} ${styles.skeletonChart}`} />
          </div>
          <div className={`${styles.skeletonGrid} ${styles.skeletonKpisGrid}`}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={`${styles.skeleton} ${styles.skeletonKpiCard}`} />
            ))}
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonList}`} />
        </div>
      ) : error ? (
        <div className={styles.errorContainer} role="alert">
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.error}>{error}</div>
          <button
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <main className={styles.dashboardContent}>
          {/* KPIs Operacionales */}
          <section className={styles.kpisSection} aria-labelledby="op-metrics-title">
            <h2 id="op-metrics-title" className={styles.sectionTitle}>{t('home.operationalMetrics')}</h2>
            <OperationalKPIs kpis={operationalKpis} />
          </section>

          {/* Gráficos Principales */}
          <section className={styles.chartsSection} aria-labelledby="charts-title">
            <h2 id="charts-title" className={styles.sectionTitle}>{t('home.dataAnalysis')}</h2>
            <div className={styles.chartsRow}>
              <CustomLineChart
                data={lineChartData}
                title={t('home.temporalEvolution')}
              />
              <CustomPieChart
                data={pieChartData}
                title={t('home.ordersByStatus')}
                translationPrefix="home.status."
              />
            </div>
          </section>

          {/* Órdenes recientes e indicadores laterales */}
          <section className={styles.recentSection} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.sectionTitle}>{t('home.recentOrders')}</h2>
            <div className={styles.bottomGrid}>
              <div className={styles.recentOrdersCard}>
                <div className={styles.recentOrdersHeader}>
                  <h3 className={styles.recentOrdersTitle}>{t('home.recentOrders')}</h3>
                  <span className={styles.recentOrdersCount}>
                    {recentWorkOrders.length} {t('common.total')}
                  </span>
                </div>
                <RecentWorkOrders workOrders={recentWorkOrders} />
              </div>

              {/* Sidebar: Inventario y Alertas */}
              <InventoryAlerts
                inventoryStats={inventoryStats}
                alerts={alerts}
              />
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default HomeDashboard

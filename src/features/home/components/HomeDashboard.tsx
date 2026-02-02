import React from "react"
import StatsCards from "./StatsCards"
import BarChart from "./BarChart"
import PieChart from "./PieChart"
import LineChart from "./LineChart"
import RecentWorkOrders from "./RecentWorkOrders"
import useHomeDashboard from "../hooks/useHomeDashboard"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"

const Skeleton = ({ height = 40, width = '100%', style = {} }: any) => (
  <div
    className={styles.skeleton}
    style={{ height, width, maxWidth: '100%', boxSizing: 'border-box', ...style }}
    aria-hidden="true"
  />
)

const HomeDashboard: React.FC = () => {
  const { t } = useTranslation()
  const {
    kpis,
    barChartData,
    pieChartData,
    lineChartData,
    recentWorkOrders,
    loading,
    error,
  } = useHomeDashboard()

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <p className={styles.subtitle}>{t('home.subtitle')}</p>
      </header>

      {loading ? (
        <div className={styles.loadingContainer}>
          {/* Skeletons mejorados */}
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={170} width={"100%"} style={{ borderRadius: 16, maxWidth: '100%' }} />
            ))}
          </div>
          <div className={styles.chartsRow}>
            <Skeleton height={280} width={"100%"} style={{ borderRadius: 16, flex: '1 1 320px', minWidth: 0, maxWidth: '100%' }} />
            <Skeleton height={280} width={"100%"} style={{ borderRadius: 16, flex: '1 1 320px', minWidth: 0, maxWidth: '100%' }} />
          </div>
          <Skeleton height={280} width={"100%"} style={{ borderRadius: 16, maxWidth: '100%' }} />
          <Skeleton height={160} width={"100%"} style={{ borderRadius: 16, maxWidth: '100%' }} />
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
          {/* Sección de KPIs */}
          <section className={styles.kpisSection} aria-labelledby="kpis-title">
            <h2 id="kpis-title" className={styles.sectionTitle}>{t('home.mainMetrics')}</h2>
            <StatsCards kpis={kpis} />
          </section>

          {/* Sección de gráficos */}
          <section className={styles.chartsSection} aria-labelledby="charts-title">
            <h2 id="charts-title" className={styles.sectionTitle}>{t('home.dataAnalysis')}</h2>
            <div className={styles.chartsRow}>
              <BarChart data={barChartData} />
              <PieChart data={pieChartData} />
            </div>
          </section>

          {/* Gráfico de línea */}
          <section className={styles.lineChartSection} aria-labelledby="trend-title">
            <h2 id="trend-title" className={styles.sectionTitle}>{t('home.orderTrend')}</h2>
            <LineChart data={lineChartData} />
          </section>

          {/* Órdenes recientes */}
          <section className={styles.recentSection} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.sectionTitle}>{t('home.recentOrders')}</h2>
            <RecentWorkOrders workOrders={recentWorkOrders} />
          </section>
        </main>
      )}
    </div>
  )
}

export default HomeDashboard
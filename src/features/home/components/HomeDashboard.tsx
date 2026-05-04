import React from "react"
import StatsCards from "./StatsCards"
import BarChart from "./BarChart"
import PieChart from "./PieChart"
import LineChart from "./LineChart"
import RecentWorkOrders from "./RecentWorkOrders"
import RangeFilter from "./RangeFilter"
import OperationalLists from "./OperationalLists"
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
    range,
    setRange,
    kpis,
    operationalKpis,
    simplifiedKpis,
    barChartData,
    pieChartData,
    priorityData,
    prevVsCorrData,
    deviceHealthData,
    lineChartData,
    recentWorkOrders,
    topIncidentInstallations,
    upcomingPreventive,
    loading,
    error,
  } = useHomeDashboard()

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className={styles.title}>{t('home.title')}</h1>
          <p className={styles.subtitle}>{t('home.subtitle')}</p>
        </div>
        <RangeFilter current={range} onChange={setRange} />
      </header>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={170} width={"100%"} style={{ borderRadius: 12, maxWidth: '100%' }} />
            ))}
          </div>
          <Skeleton height={150} width={"100%"} style={{ borderRadius: 12, maxWidth: '100%' }} />
          <div className={styles.chartsRow}>
            <Skeleton height={280} width={"100%"} style={{ borderRadius: 12, flex: '1 1 320px', minWidth: 0, maxWidth: '100%' }} />
            <Skeleton height={280} width={"100%"} style={{ borderRadius: 12, flex: '1 1 320px', minWidth: 0, maxWidth: '100%' }} />
          </div>
          <Skeleton height={320} width={"100%"} style={{ borderRadius: 12, maxWidth: '100%' }} />
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
          {/* Sección de KPIs Resumidos */}
          <section className={styles.kpisSection} aria-labelledby="kpis-title">
            <h2 id="kpis-title" className={styles.sectionTitle}>{t('home.mainMetrics')}</h2>
            <StatsCards kpis={simplifiedKpis} />
          </section>

          {/* Sección de gráficos 1: Prioridad y Preventivo vs Correctivo */}
          <section className={styles.chartsSection} aria-labelledby="charts-dist-title">
            <h2 id="charts-dist-title" className={styles.sectionTitle}>{t('home.workDistribution', { defaultValue: 'Distribución de Trabajo' })}</h2>
            <div className={styles.chartsRow}>
              <PieChart 
                data={priorityData} 
                title={t('home.byPriority', { defaultValue: 'Órdenes por Prioridad' })} 
                translationPrefix="home.priority."
              />
              <BarChart 
                data={prevVsCorrData} 
                title={t('home.prevVsCorr', { defaultValue: 'Preventivo vs Correctivo' })} 
                translationPrefix="home.type."
              />
            </div>
          </section>

          {/* Sección de gráficos 2: Tipo y Estado */}
          <section className={styles.chartsSection} aria-labelledby="charts-status-title">
            <div className={styles.chartsRow}>
              <BarChart data={barChartData} title={t('home.ordersByType')} />
              <PieChart data={pieChartData} title={t('home.ordersByStatus')} />
            </div>
          </section>

          {/* Salud de dispositivos y Tendencia */}
          <section className={styles.chartsSection} aria-labelledby="trend-title">
            <h2 id="trend-title" className={styles.sectionTitle}>{t('home.healthAndTrends', { defaultValue: 'Salud y Tendencias' })}</h2>
            <div className={styles.trendsRow}>
               <PieChart 
                data={deviceHealthData} 
                title={t('home.deviceHealth', { defaultValue: 'Estado de Salud de Activos' })} 
                translationPrefix="home.health."
              />
              <LineChart data={lineChartData} title={t('home.evolutionCreatedVsCompleted', { defaultValue: 'Evolución: Creadas vs Completadas' })} />
            </div>
          </section>

          {/* Insights Operativos */}
          <section className={styles.chartsSection} aria-labelledby="insights-title">
            <h2 id="insights-title" className={styles.sectionTitle}>{t('home.operationalInsights', { defaultValue: 'Insights Operativos' })}</h2>
            <OperationalLists topIncidents={topIncidentInstallations} upcomingPreventive={upcomingPreventive} />
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

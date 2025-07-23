import React from "react"
import StatsCards from "./StatsCards"
import BarChart from "./BarChart"
import PieChart from "./PieChart"
import RecentWorkOrders from "./RecentWorkOrders"
import useHomeDashboard from "../hooks/useHomeDashboard"
import styles from "../styles/home.module.css"
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"
import { useTranslation } from "react-i18next"

const Skeleton = ({ height = 40, width = '100%', style = {} }) => (
  <div
    className={styles.skeleton}
    style={{ height, width, ...style }}
    aria-hidden="true"
  />
)

const CustomLineChartTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation()
  
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--color-text)' }}>
          {`${t('common.date')}: ${label}`}
        </p>
        <p style={{ margin: '0', color: 'var(--color-text)', opacity: 0.8 }}>
          {`${t('workOrders.title')}: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const LineChart = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const { t } = useTranslation()
  
  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label={t('home.temporalEvolution')}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{t('home.temporalEvolution')}</h3>
          <div className={styles.chartStats}>
            <span className={styles.chartTotal}>0 {t('common.total')}</span>
          </div>
        </div>
        <div className={styles.chartPlaceholder}>
          <p>{t('common.noDataAvailable')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chartCard} role="region" aria-label={t('home.temporalEvolution')}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{t('home.temporalEvolution')}</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} {t('common.total')}</span>
        </div>
      </div>
      
      <div className={styles.lineChartContainer} style={{ height: '320px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart 
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-card-border)' }}
              tickLine={{ stroke: 'var(--color-card-border)' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-card-border)' }}
              tickLine={{ stroke: 'var(--color-card-border)' }}
            />
            <Tooltip content={<CustomLineChartTooltip />} />
            <Line 
              type="natural" 
              dataKey="value" 
              stroke="var(--color-primary)" 
              strokeWidth={3}
              fill="none"
              dot={{ 
                fill: 'var(--color-primary)', 
                strokeWidth: 2, 
                r: 5,
                stroke: 'var(--color-bg)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}
              activeDot={{ 
                r: 7, 
                stroke: 'var(--color-primary)', 
                strokeWidth: 2, 
                fill: 'var(--color-primary)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

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
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          </div>
          <Skeleton height={220} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          <Skeleton height={220} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
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
import React from "react"
import StatsCards from "./StatsCards"
import BarChart from "./BarChart"
import PieChart from "./PieChart"
import RecentWorkOrders from "./RecentWorkOrders"
import useHomeDashboard from "../hooks/useHomeDashboard"
import styles from "../styles/home.module.css"
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"

const Skeleton = ({ height = 40, width = '100%', style = {} }) => (
  <div
    className={styles.skeleton}
    style={{ height, width, ...style }}
    aria-hidden="true"
  />
)

const CustomLineChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--color-text)' }}>
          {`Fecha: ${label}`}
        </p>
        <p style={{ margin: '0', color: 'var(--color-text)', opacity: 0.8 }}>
          {`Órdenes: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const LineChart = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label="Gráfico de línea - Evolución temporal">
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Evolución Temporal</h3>
          <div className={styles.chartStats}>
            <span className={styles.chartTotal}>0 total</span>
          </div>
        </div>
        <div className={styles.chartPlaceholder}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chartCard} role="region" aria-label="Gráfico de línea - Evolución temporal">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Evolución Temporal</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
        </div>
      </div>
      
      <div className={styles.lineChartContainer} style={{ height: '250px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomLineChartTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2, fill: '#8884d8' }}
            />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const HomeDashboard: React.FC = () => {
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
        <h1 className={styles.title}>Panel de Control</h1>
        <p className={styles.subtitle}>Resumen general de operaciones</p>
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
            Reintentar
          </button>
        </div>
      ) : (
        <main className={styles.dashboardContent}>
          {/* Sección de KPIs */}
          <section className={styles.kpisSection} aria-labelledby="kpis-title">
            <h2 id="kpis-title" className={styles.sectionTitle}>Métricas Principales</h2>
            <StatsCards kpis={kpis} />
          </section>

          {/* Sección de gráficos */}
          <section className={styles.chartsSection} aria-labelledby="charts-title">
            <h2 id="charts-title" className={styles.sectionTitle}>Análisis de Datos</h2>
            <div className={styles.chartsRow}>
              <BarChart data={barChartData} />
              <PieChart data={pieChartData} />
            </div>
          </section>

          {/* Gráfico de línea */}
          <section className={styles.lineChartSection} aria-labelledby="trend-title">
            <h2 id="trend-title" className={styles.sectionTitle}>Tendencia de Órdenes</h2>
            <LineChart data={lineChartData} />
          </section>

          {/* Órdenes recientes */}
          <section className={styles.recentSection} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.sectionTitle}>Órdenes Recientes</h2>
            <RecentWorkOrders workOrders={recentWorkOrders} />
          </section>
        </main>
      )}
    </div>
  )
}

export default HomeDashboard
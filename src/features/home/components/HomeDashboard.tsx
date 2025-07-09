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
            <div className={styles.chartCard}>
              <ResponsiveContainer width="100%" height={220}>
                <ReLineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--color-text)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    stroke="var(--color-text)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-card-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3} 
                    dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'var(--color-primary)', strokeWidth: 2 }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
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
import React from "react"
import StatsCards from "./StatsCards"
import BarChart from "./BarChart"
import PieChart from "./PieChart"
import RecentWorkOrders from "./RecentWorkOrders"
import useHomeDashboard from "../hooks/useHomeDashboard"
import styles from "../styles/home.module.css"
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"

const Spinner = () => (
  <div className={styles.spinnerContainer}>
    <svg className={styles.spinner} viewBox="0 0 50 50">
      <circle className={styles.path} cx="25" cy="25" r="20" fill="none" strokeWidth="5" />
    </svg>
  </div>
)

const Skeleton = ({ height = 40, width = '100%', style = {} }) => (
  <div
    className={styles.skeleton}
    style={{ height, width, ...style }}
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
      <h1 className={styles.title}>Panel</h1>
      {loading ? (
        <>
          {/* 4 skeletons grandes, uno por cada contenedor principal */}
          <Skeleton height={90} width={"100%"} style={{borderRadius:14, marginBottom:24}} />
          <Skeleton height={220} width={"100%"} style={{borderRadius:14, marginBottom:24}} />
          <Skeleton height={220} width={"100%"} style={{borderRadius:14, marginBottom:24}} />
          <Skeleton height={160} width={"100%"} style={{borderRadius:14, marginBottom:24}} />
        </>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <StatsCards kpis={kpis} />
          <div className={styles.chartsRow}>
            <BarChart data={barChartData} />
            <PieChart data={pieChartData} />
          </div>
          <div className={styles.chartCard}>
            <h3 style={{color: 'var(--color-text)'}}>Órdenes en el tiempo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ReLineChart data={lineChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#111" />
                <YAxis allowDecimals={false} stroke="#111" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={3} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
          <RecentWorkOrders workOrders={recentWorkOrders} />
        </>
      )}
    </div>
  )
}

export default HomeDashboard
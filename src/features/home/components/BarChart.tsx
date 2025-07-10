import React from "react"
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts"
import styles from "../styles/home.module.css"

interface BarChartData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
}

const COLORS = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const CustomBarChart: React.FC<BarChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label="Gráfico de barras - Órdenes por tipo">
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Órdenes por Tipo</h3>
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
    <div className={styles.chartCard} role="region" aria-label="Gráfico de barras - Órdenes por tipo">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Órdenes por Tipo</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
        </div>
      </div>
      
      <div className={styles.barChartContainer} style={{ height: '250px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8">
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CustomBarChart 
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--color-text)' }}>
          {`${label}`}
        </p>
        <p style={{ margin: '0', color: 'var(--color-text)', opacity: 0.8 }}>
          {`Órdenes: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

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
          <ReBarChart 
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              barSize={40}
            >
              {data.map((entry, idx) => (
                <Cell 
                  key={`cell-${idx}`} 
                  fill={entry.color || COLORS[idx % COLORS.length]}
                  opacity={0.9}
                />
              ))}
            </Bar>
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CustomBarChart 
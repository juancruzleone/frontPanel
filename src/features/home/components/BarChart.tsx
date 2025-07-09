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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-card-border)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'var(--color-text)',
          fontSize: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{`Tipo: ${label}`}</p>
          <p style={{ margin: '0', color: 'var(--color-text)' }}>
            {`Órdenes: ${payload[0].value}`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.chartCard} role="region" aria-label="Gráfico de barras - Órdenes por tipo">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Órdenes por Tipo</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={220}>
        <ReBarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--color-card-border)"
            opacity={0.5}
          />
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
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{
              color: 'var(--color-text)',
              fontSize: '12px'
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
            animationBegin={0}
          >
            {data.map((entry, idx) => (
              <Cell 
                key={`cell-${idx}`} 
                fill={entry.color || COLORS[idx % COLORS.length]}
                stroke={entry.color || COLORS[idx % COLORS.length]}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CustomBarChart 
import React from "react"
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import styles from "../styles/panelAdmin.module.css"

interface TenantEvolutionData {
  name: string
  value: number
}

interface TenantLineChartProps {
  data: TenantEvolutionData[]
}

const CustomLineChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--color-text)' }}>
          {`Fecha: ${label}`}
        </p>
        <p style={{ margin: '0', color: 'var(--color-text)', opacity: 0.8 }}>
          {`Tenants: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const TenantLineChart: React.FC<TenantLineChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label="Evolución Temporal">
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
    <div className={styles.chartCard} role="region" aria-label="Evolución Temporal">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Evolución Temporal</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
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

export default TenantLineChart 
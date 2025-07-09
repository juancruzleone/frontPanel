import React from "react"
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import styles from "../styles/home.module.css"

interface PieChartData {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartData[]
}

const COLORS = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const CustomPieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return percent > 0.05 ? (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null
  }

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
          <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{`Estado: ${label}`}</p>
          <p style={{ margin: '0', color: 'var(--color-text)' }}>
            {`Órdenes: ${payload[0].value}`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.chartCard} role="region" aria-label="Gráfico circular - Órdenes por estado">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Órdenes por Estado</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={220}>
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            innerRadius={30}
            label={renderCustomizedLabel}
            labelLine={false}
            animationDuration={1000}
            animationBegin={0}
          >
            {data.map((entry, idx) => (
              <Cell 
                key={`cell-${idx}`} 
                fill={entry.color || COLORS[idx % COLORS.length]}
                stroke="var(--color-card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            wrapperStyle={{
              paddingTop: '16px',
              color: 'var(--color-text)',
              fontSize: '12px'
            }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CustomPieChart 
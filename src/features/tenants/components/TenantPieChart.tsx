import React from "react"
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import styles from "../styles/panelAdmin.module.css"

interface StatusDistributionData {
  name: string
  value: number
  color: string
}

interface TenantPieChartProps {
  data: StatusDistributionData[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const statusNames: { [key: string]: string } = {
      'active': 'Activo',
      'suspended': 'Suspendido',
      'cancelled': 'Cancelado'
    };
    const statusName = statusNames[payload[0].name] || payload[0].name;
    return (
      <div className={styles.customTooltip} style={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-card-border)', borderRadius: 8 }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
          {statusName}
        </p>
        <p style={{ margin: '0', opacity: 0.8 }}>
          {`Tenants: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const TenantPieChart: React.FC<TenantPieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label="Distribución por Estados">
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Distribución por Estados</h3>
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
    <div className={styles.chartCard} role="region" aria-label="Distribución por Estados">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Distribución por Estados</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
        </div>
      </div>
      
      <div className={styles.pieChartFlexContainer}>
        <div className={styles.pieChartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.percentagesContainer}>
          {data.map((entry, index) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
            const statusNames: { [key: string]: string } = {
              'active': 'Activo',
              'suspended': 'Suspendido',
              'cancelled': 'Cancelado'
            };
            const statusName = statusNames[entry.name] || entry.name;
            
            return (
              <div key={entry.name} className={styles.percentageItem}>
                <div 
                  className={styles.percentageColor} 
                  style={{ backgroundColor: entry.color }}
                />
                <div className={styles.percentageContent}>
                  <div className={styles.percentageName}>{statusName}</div>
                  <div className={styles.percentageValue}>{percentage}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TenantPieChart 
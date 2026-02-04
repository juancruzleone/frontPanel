import React from "react"
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useTranslation } from "react-i18next"
import { WORK_ORDER_STATUS_COLORS } from "../../../utils/chartColors"
import styles from "../styles/workOrders.module.css"

interface StatusDistributionData {
  name: string
  value: number
  color?: string
}

interface WorkOrdersPieChartProps {
  data: StatusDistributionData[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
          {payload[0].name}
        </p>
        <p style={{ margin: '0', opacity: 0.8 }}>
          {`Órdenes: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const WorkOrdersPieChart: React.FC<WorkOrdersPieChartProps> = ({ data }) => {
  const { t } = useTranslation()
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{t('workOrders.distributionByStatus')}</h3>
          <div className={styles.chartStats}>
            <span className={styles.chartTotal}>0 total</span>
          </div>
        </div>
        <div className={styles.chartPlaceholder}>
          <p>{t('workOrders.noDataAvailable')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{t('workOrders.distributionByStatus')}</h3>
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
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={WORK_ORDER_STATUS_COLORS[entry.name] || 'var(--color-primary)'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.percentagesContainer}>
          {data.map((entry) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
            
            return (
              <div key={entry.name} className={styles.percentageItem}>
                <div 
                  className={styles.percentageColor} 
                  style={{ backgroundColor: WORK_ORDER_STATUS_COLORS[entry.name] || 'var(--color-primary)' }}
                />
                <div className={styles.percentageContent}>
                  <div className={styles.percentageName}>{entry.name}</div>
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

export default WorkOrdersPieChart

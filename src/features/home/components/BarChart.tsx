import React from "react"
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"

interface BarChartData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
}

const COLORS = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]
const COLORS_LIGHT = ["#000", "#111", "#222", "#333", "#444"]

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation()
  if (active && payload && payload.length) {
    const tipoClave = payload[0]?.payload?.name
    return (
      <div className={styles.customTooltip} style={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-card-border)', borderRadius: 8 }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>
          {t('workOrders.form.' + tipoClave)}
        </p>
        <p style={{ margin: '0', opacity: 0.8 }}>
          {`${t('workOrders.title')}: ${payload[0].value}`}
        </p>
      </div>
    )
  }
  return null
}

const CustomBarChart: React.FC<BarChartProps> = ({ data }) => {
  const { t } = useTranslation()
  const { dark } = useTheme()
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label={t('home.ordersByType')}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{t('home.ordersByType')}</h3>
          <div className={styles.chartStats}>
            <span className={styles.chartTotal}>0 {t('common.total')}</span>
          </div>
        </div>
        <div className={styles.chartPlaceholder}>
          <p>{t('common.noDataAvailable')}</p>
        </div>
      </div>
    )
  }

  const renderTick = (t: (key: string) => string) => (props: any) => {
    const { x, y, payload } = props;
    return (
      <text x={x} y={y + 10} textAnchor="middle" fontSize={12} fill="var(--color-text-secondary)">
        {t('workOrders.form.' + payload.value)}
      </text>
    );
  };

  return (
    <div className={styles.chartCard} role="region" aria-label={t('home.ordersByType')}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{t('home.ordersByType')}</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} {t('common.total')}</span>
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
              tick={renderTick(t)}
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
                  fill={entry.color || (dark ? COLORS[idx % COLORS.length] : COLORS_LIGHT[idx % COLORS_LIGHT.length])}
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
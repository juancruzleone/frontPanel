import React from "react"
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"

interface PieChartData {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartData[]
}

// Colores mejorados para diferenciar mejor los estados
const COLORS = [
  "#1976d2", // Azul - Pendiente
  "#ff9800", // Naranja - En progreso (cambiado de verde a naranja)
  "#4caf50", // Verde - Completada
  "#f44336", // Rojo - Cancelada
  "#9c27b0"  // Púrpura - Otros
]

const CustomTooltip = ({ active, payload }: any) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    const estadoClave = payload[0]?.payload?.name;
    return (
      <div style={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-card-border)', borderRadius: 8, padding: 8 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{t('workOrders.' + estadoClave)}</p>
        <p style={{ margin: 0, opacity: 0.8 }}>{t('common.total')}: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const CustomPieChart: React.FC<PieChartProps> = ({ data }) => {
  const { t } = useTranslation()
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  // Calcular porcentajes para la leyenda personalizada
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
  }))

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label={t('home.ordersByStatus')}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{t('home.ordersByStatus')}</h3>
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

  return (
    <div className={styles.chartCard} role="region" aria-label={t('home.ordersByStatus')}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{t('home.ordersByStatus')}</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} {t('common.total')}</span>
        </div>
      </div>
      
      <div className={styles.pieChartFlexContainer}>
        <div className={styles.pieChartContainer} style={{ height: '250px', width: '60%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={30}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]}
                    stroke="var(--color-bg)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Porcentajes sin contenedor */}
        <div className={styles.percentagesContainer}>
          {dataWithPercentages.map((item, index) => (
            <div key={index} className={styles.percentageItem}>
              <div className={styles.percentageColor} style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></div>
              <div className={styles.percentageContent}>
                <span className={styles.percentageName}>{t(`workOrders.${item.name}`)}</span>
                <span className={styles.percentageValue}>{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CustomPieChart 
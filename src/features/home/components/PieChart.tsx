import React from "react"
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import styles from "../styles/home.module.css"

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

const CustomPieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  // Calcular porcentajes para la leyenda personalizada
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
  }))

  if (!data || data.length === 0) {
    return (
      <div className={styles.chartCard} role="region" aria-label="Gráfico circular - Órdenes por estado">
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Órdenes por Estado</h3>
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
    <div className={styles.chartCard} role="region" aria-label="Gráfico circular - Órdenes por estado">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Órdenes por Estado</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} total</span>
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
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text)'
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Porcentajes sin contenedor */}
        <div className={styles.percentagesContainer}>
          {dataWithPercentages.map((item, index) => (
            <div key={index} className={styles.percentageItem}>
              <div className={styles.percentageColor} style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></div>
              <div className={styles.percentageContent}>
                <span className={styles.percentageName}>{item.name}</span>
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
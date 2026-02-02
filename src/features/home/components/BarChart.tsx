import React, { useState, useMemo } from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"

interface BarChartData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
}

const CustomBarChart: React.FC<BarChartProps> = ({ data }) => {
  const { t } = useTranslation()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data])

  // Crear líneas de guía (Grid) - 4 líneas
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxValue * p))

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

  return (
    <div className={styles.chartCard} role="region" aria-label={t('home.ordersByType')}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{t('home.ordersByType')}</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{total} {t('common.total')}</span>
        </div>
      </div>

      <div className={styles.pieChartFlexContainer}> {/* Reusamos el contenedor flex para tener el mismo layout */}
        {/* Gráfico de Barras SVG - ViewBox aumentado a 220 para ver etiquetas */}
        <div className={styles.barChartContainer} style={{ width: '100%', height: '250px', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 300 220" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            {gridLines.map((val, i) => {
              const y = 200 - (val / maxValue) * 180 - 20 // Dejar espacio abajo
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1="0"
                    y1={y}
                    x2="300"
                    y2={y}
                    stroke="var(--color-card-border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                  <text
                    x="-10"
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--color-text)"
                    opacity="0.5"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Barras */}
            {data.map((item, index) => {
              const barHeight = (item.value / maxValue) * 180
              const slotWidth = 280 / data.length

              // Barra más gruesa: ocupa el 60% del espacio disponible, hasta un máximo de 60px
              const barThickness = Math.min(slotWidth * 0.6, 60)

              const x = 10 + index * slotWidth + (slotWidth - barThickness) / 2 // Centrado
              const y = 200 - barHeight - 20

              const isHovered = hoveredIndex === index
              const color = item.color || "var(--color-primary)"

              return (
                <g
                  key={`bar-${index}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={barThickness}
                    height={barHeight}
                    fill={color}
                    rx="6"
                    ry="6"
                    opacity={isHovered ? 1 : 0.9}
                    filter={isHovered ? "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" : "none"}
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? `scaleY(1.05)` : 'scaleY(1)',
                      transformOrigin: `${x + barThickness / 2}px ${y + barHeight}px`
                    }}
                  />
                  {/* Etiqueta Eje X (truncada si es larga) - Ahora visible gracias a viewBox 220 */}
                  <text
                    x={x + barThickness / 2}
                    y={215}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--color-text)"
                    opacity="0.75"
                    fontWeight={isHovered ? "bold" : "500"}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    {t('workOrders.form.' + item.name).substring(0, 10).toLowerCase() + (t('workOrders.form.' + item.name).length > 10 ? '.' : '')}
                  </text>

                  {/* Tooltip flotante MEJORADO */}
                  {isHovered && (
                    <g pointerEvents="none" style={{ zIndex: 100 }}>
                      <rect
                        x={x + barThickness / 2 - 60}
                        y={y - 55}
                        width="120"
                        height="45"
                        rx="8"
                        fill="var(--color-card)"
                        stroke="var(--color-card-border)"
                        strokeWidth="1"
                        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                      />
                      {/* Nombre de la categoría */}
                      <text
                        x={x + barThickness / 2}
                        y={y - 38}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="var(--color-text)"
                        opacity="0.9"
                        style={{ textTransform: 'capitalize' }}
                      >
                        {t('workOrders.form.' + item.name)}
                      </text>
                      {/* Valor numérico */}
                      <text
                        x={x + barThickness / 2}
                        y={y - 20}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="800"
                        fill={color}
                      >
                        {item.value} {t('common.total')}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Leyenda lateral */}
        <div className={styles.percentagesContainer}>
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0"
            const color = item.color || "var(--color-primary)"

            return (
              <div
                key={index}
                className={`${styles.percentageItem} ${isHovered ? styles.percentageItemActive : ''}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  background: isHovered ? `${color}15` : 'transparent',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div
                  className={styles.percentageColor}
                  style={{
                    backgroundColor: color,
                    boxShadow: isHovered ? `0 0 12px ${color}50` : 'none',
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                />
                <div className={styles.percentageContent}>
                  <span className={styles.percentageName}>
                    {t(`workOrders.form.${item.name}`)}
                  </span>
                  <span
                    className={styles.percentageValue}
                    style={{
                      color: color,
                      fontWeight: 700
                    }}
                  >
                    {item.value} ({percentage}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CustomBarChart
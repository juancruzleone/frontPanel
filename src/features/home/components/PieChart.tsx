import React, { useState, useMemo } from "react"
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

// Colores premium para cada estado
const STATUS_COLORS: Record<string, string> = {
  pendiente: "#6366f1",    // Indigo vibrante
  asignada: "#f59e0b",     // Ámbar cálido
  en_progreso: "#3b82f6",  // Azul brillante
  completada: "#10b981",   // Esmeralda
  cancelada: "#ef4444",    // Rojo coral
}

const CustomPieChart: React.FC<PieChartProps> = ({ data }) => {
  const { t } = useTranslation()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Filtrar datos con valor > 0 y calcular total
  const filteredData = useMemo(() => data.filter(item => item.value > 0), [data])
  const total = useMemo(() => filteredData.reduce((sum, item) => sum + item.value, 0), [filteredData])

  // Calcular ángulos para cada segmento
  const segments = useMemo(() => {
    let currentAngle = -90 // Empezar desde arriba
    return filteredData.map((item, index) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0
      const angle = (percentage / 100) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        color: item.color || STATUS_COLORS[item.name] || "#8b5cf6"
      }
    })
  }, [filteredData, total])

  // Función para crear el path de un segmento del donut
  const createArcPath = (startAngle: number, endAngle: number, radius: number, innerRadius: number) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = 100 + radius * Math.cos(startRad)
    const y1 = 100 + radius * Math.sin(startRad)
    const x2 = 100 + radius * Math.cos(endRad)
    const y2 = 100 + radius * Math.sin(endRad)

    const x3 = 100 + innerRadius * Math.cos(endRad)
    const y3 = 100 + innerRadius * Math.sin(endRad)
    const x4 = 100 + innerRadius * Math.cos(startRad)
    const y4 = 100 + innerRadius * Math.sin(startRad)

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `
  }

  if (!data || data.length === 0 || total === 0) {
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
        {/* Gráfico SVG */}
        <div className={styles.pieChartContainer}>
          <svg viewBox="0 0 200 200" className={styles.pieChartSvg}>
            {/* Definición de sombras y gradientes */}
            <defs>
              <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
              <filter id="hoverShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
              </filter>
              {segments.map((segment, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`gradient-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={segment.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={segment.color} stopOpacity="0.7" />
                </linearGradient>
              ))}
            </defs>

            {/* Círculo de fondo sutil */}
            <circle
              cx="100"
              cy="100"
              r="75"
              fill="none"
              stroke="var(--color-card-border)"
              strokeWidth="1"
              opacity="0.3"
            />

            {/* Segmentos del donut */}
            {segments.map((segment, index) => {
              const isHovered = hoveredIndex === index
              const outerRadius = isHovered ? 82 : 78
              const innerRadius = isHovered ? 42 : 45

              return (
                <path
                  key={`segment-${index}`}
                  d={createArcPath(segment.startAngle, segment.endAngle, outerRadius, innerRadius)}
                  fill={`url(#gradient-${index})`}
                  stroke="var(--color-card)"
                  strokeWidth="2"
                  filter={isHovered ? "url(#hoverShadow)" : "url(#dropShadow)"}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: '100px 100px'
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )
            })}

            {/* Centro: total o valor hover */}
            <g className={styles.pieChartCenter}>
              <circle
                cx="100"
                cy="100"
                r="38"
                fill="var(--color-card)"
                stroke="var(--color-card-border)"
                strokeWidth="1"
              />
              {hoveredIndex !== null ? (
                <>
                  <text
                    x="100"
                    y="95"
                    textAnchor="middle"
                    fill="var(--color-text)"
                    fontSize="20"
                    fontWeight="800"
                  >
                    {segments[hoveredIndex].value}
                  </text>
                  <text
                    x="100"
                    y="112"
                    textAnchor="middle"
                    fill="var(--color-text)"
                    fontSize="8"
                    fontWeight="600"
                    opacity="0.7"
                  >
                    {segments[hoveredIndex].percentage.toFixed(0)}%
                  </text>
                </>
              ) : (
                <>
                  <text
                    x="100"
                    y="95"
                    textAnchor="middle"
                    fill="var(--color-text)"
                    fontSize="22"
                    fontWeight="800"
                  >
                    {total}
                  </text>
                  <text
                    x="100"
                    y="112"
                    textAnchor="middle"
                    fill="var(--color-text)"
                    fontSize="8"
                    fontWeight="600"
                    opacity="0.6"
                  >
                    {t('common.total').toUpperCase()}
                  </text>
                </>
              )}
            </g>
          </svg>
        </div>

        {/* Leyenda moderna - Muestra TODOS los estados siempre */}
        <div className={styles.percentagesContainer}>
          {data.map((item, index) => {
            // Buscar si este item tiene representación en el gráfico (para hover)
            const segmentIndex = segments.findIndex(s => s.name === item.name)
            const isHovered = hoveredIndex === segmentIndex && segmentIndex !== -1
            const color = item.color || STATUS_COLORS[item.name] || "#8b5cf6"
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0"

            return (
              <div
                key={index}
                className={`${styles.percentageItem} ${isHovered ? styles.percentageItemActive : ''}`}
                onMouseEnter={() => segmentIndex !== -1 && setHoveredIndex(segmentIndex)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  background: isHovered ? `${color}15` : 'transparent',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  transition: 'all 0.2s ease',
                  opacity: item.value === 0 ? 0.7 : 1, // Un poco más transparente si es 0
                  cursor: item.value > 0 ? 'pointer' : 'default'
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
                    {t(`workOrders.${item.name}`)}
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

export default CustomPieChart
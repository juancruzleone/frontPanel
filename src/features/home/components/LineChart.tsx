import React, { useState, useMemo } from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"

interface LineChartData {
    name: string
    value: number
}

interface LineChartProps {
    data: LineChartData[]
}

const CustomLineChart: React.FC<LineChartProps> = ({ data }) => {
    const { t } = useTranslation()
    const { dark } = useTheme()
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data])

    // Dimensiones
    const width = 800 // ViewBox width
    const height = 300 // ViewBox height
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }

    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    // Grid Lines Y
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxValue * p))

    // Calcular coordenadas de puntos
    const points: [number, number][] = useMemo(() => {
        if (data.length === 0) return []
        const stepX = graphWidth / (data.length - 1 || 1)
        return data.map((d, i) => [
            padding.left + i * stepX,
            height - padding.bottom - (d.value / maxValue) * graphHeight
        ])
    }, [data, maxValue, graphHeight, graphWidth])

    // Crear Path "Area" (cerrado abajo) para el gradiente
    const areaPath = useMemo(() => {
        if (points.length === 0) return ""
        let path = `M ${points[0][0]} ${height - padding.bottom}` // Start bottom-left
        points.forEach(p => path += ` L ${p[0]} ${p[1]}`) // Line to points
        path += ` L ${points[points.length - 1][0]} ${height - padding.bottom} Z` // Close bottom-right
        return path
    }, [points])

    // Crear Path "Line" (solo la línea superior)
    const linePath = useMemo(() => {
        if (points.length === 0) return ""
        let path = `M ${points[0][0]} ${points[0][1]}`
        points.forEach((p, i) => { if (i > 0) path += ` L ${p[0]} ${p[1]}` })
        return path
    }, [points])


    if (!data || data.length === 0) {
        return (
            <div className={styles.chartCard} role="region" aria-label={t('home.temporalEvolution')}>
                <div className={styles.chartHeader}>
                    <h3 className={styles.chartTitle}>{t('home.temporalEvolution')}</h3>
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

    // Color: Negro (#000000) en modo claro, Blanco (#FFFFFF) en modo oscuro
    const chartColor = dark ? "#FFFFFF" : "#000000"
    const gridColor = dark ? "#FFFFFF" : "#000000"

    return (
        <div className={styles.chartCard} role="region" aria-label={t('home.temporalEvolution')}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>{t('home.temporalEvolution')}</h3>
                <div className={styles.chartStats}>
                    <span className={styles.chartTotal}>{total} {t('common.total')}</span>
                </div>
            </div>

            <div className={styles.lineChartContainer} style={{ width: '100%', height: '320px', position: 'relative' }}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColor} stopOpacity={dark ? 0.3 : 0.1} />
                            <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
                        </filter>
                    </defs>

                    {/* Grid Lines Horizontales */}
                    {gridLines.map((val, i) => {
                        const y = height - padding.bottom - (val / maxValue) * graphHeight
                        return (
                            <g key={`grid-y-${i}`}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke={gridColor}
                                    strokeWidth="1"
                                    strokeDasharray="5 5"
                                    opacity="0.15"
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="10"
                                    fill={gridColor}
                                    opacity="0.5"
                                >
                                    {val}
                                </text>
                            </g>
                        )
                    })}

                    {/* Área de relleno */}
                    <path d={areaPath} fill="url(#areaGradient)" />

                    {/* Línea principal */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={chartColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#lineShadow)"
                    />

                    {/* Puntos interactivos y Etiquetas Eje X */}
                    {points.map((p, i) => {
                        const isHovered = hoveredIndex === i
                        const tooltipWidth = 112
                        const tooltipHeight = 38
                        const tooltipX = Math.min(Math.max(p[0] - tooltipWidth / 2, 8), width - tooltipWidth - 8)
                        const tooltipY = Math.max(p[1] - 50, 8)
                        // Mostrar etiquetas Eje X solo para algunos puntos
                        const showLabel = data.length < 10 || i % Math.ceil(data.length / 10) === 0

                        return (
                            <g key={`point-${i}`}>
                                {/* Línea vertical en hover */}
                                {isHovered && (
                                    <line
                                        x1={p[0]}
                                        y1={padding.top}
                                        x2={p[0]}
                                        y2={height - padding.bottom}
                                        stroke={chartColor}
                                        strokeWidth="1"
                                        strokeDasharray="3 3"
                                        opacity="0.2"
                                    />
                                )}

                                {/* Círculo invisible grande para aumentar target de hover */}
                                <circle
                                    cx={p[0]}
                                    cy={p[1]}
                                    r="15"
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={{ cursor: 'pointer' }}
                                />

                                {/* Punto visible - Color negro en light mode */}
                                <circle
                                    cx={p[0]}
                                    cy={p[1]}
                                    r={isHovered ? 6 : 4}
                                    fill={chartColor}
                                    stroke="var(--color-bg)"
                                    strokeWidth="2"
                                    style={{
                                        pointerEvents: 'none',
                                        transition: 'r 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                />

                                {/* Etiqueta Eje X */}
                                {showLabel && (
                                    <text
                                        x={p[0]}
                                        y={height - 5}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill={gridColor}
                                        opacity="0.5"
                                        transform={`rotate(0, ${p[0]}, ${height - 5})`}
                                    >
                                        {data[i].name}
                                    </text>
                                )}

                                {/* Tooltip SVG */}
                                {isHovered && (
                                    <g pointerEvents="none">
                                        <rect
                                            x={tooltipX}
                                            y={tooltipY}
                                            width={tooltipWidth}
                                            height={tooltipHeight}
                                            rx="6"
                                            fill="var(--color-card)"
                                            stroke="var(--color-card-border)"
                                            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                                        />
                                        <text
                                            x={tooltipX + tooltipWidth / 2}
                                            y={tooltipY + 15}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="bold"
                                            fill={gridColor}
                                        >
                                            {data[i].name}
                                        </text>
                                        <text
                                            x={tooltipX + tooltipWidth / 2}
                                            y={tooltipY + 29}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill={chartColor}
                                            fontWeight="800"
                                        >
                                            {data[i].value} Ordenes
                                        </text>
                                    </g>
                                )}
                            </g>
                        )
                    })}
                </svg>
            </div>


        </div>
    )
}

export default CustomLineChart

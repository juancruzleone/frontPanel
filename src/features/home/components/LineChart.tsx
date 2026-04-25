import React, { useState, useMemo } from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"
import { MultiSeriesLineData } from "../types/homeTypes"

interface LineChartProps {
    data: MultiSeriesLineData[]
    title?: string
}

const CustomLineChart: React.FC<LineChartProps> = ({ data, title }) => {
    const { t } = useTranslation()
    const { dark } = useTheme()
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    // Identificar las series disponibles (todas las keys excepto 'name')
    const seriesKeys = useMemo(() => {
        if (data.length === 0) return []
        return Object.keys(data[0]).filter(k => k !== 'name')
    }, [data])

    const maxValue = useMemo(() => {
        let max = 0
        data.forEach(d => {
            seriesKeys.forEach(k => {
                const val = Number(d[k]) || 0
                if (val > max) max = val
            })
        })
        return Math.max(max, 1)
    }, [data, seriesKeys])

    // Dimensiones
    const width = 800 // ViewBox width
    const height = 300 // ViewBox height
    const padding = { top: 20, right: 30, bottom: 40, left: 40 }

    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    // Grid Lines Y
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxValue * p))

    // Colores por serie
    const getSeriesColor = (key: string, index: number) => {
        const colors = [
            dark ? "#60a5fa" : "#2563eb", // Primary/Created
            dark ? "#34d399" : "#059669", // Success/Completed
            dark ? "#f87171" : "#dc2626", // Danger
            dark ? "#fbbf24" : "#d97706"  // Warning
        ]
        
        // Mapeo específico por nombre de serie si existe
        const mapping: { [key: string]: string } = {
            'created': dark ? "#60a5fa" : "#2563eb",
            'completed': dark ? "#34d399" : "#059669",
            'creadas': dark ? "#60a5fa" : "#2563eb",
            'completadas': dark ? "#34d399" : "#059669"
        }

        return mapping[key.toLowerCase()] || colors[index % colors.length]
    }

    // Calcular puntos por serie
    const seriesPoints = useMemo(() => {
        if (data.length === 0) return {}
        const stepX = graphWidth / (data.length - 1 || 1)
        
        const result: { [key: string]: [number, number][] } = {}
        
        seriesKeys.forEach(key => {
            result[key] = data.map((d, i) => [
                padding.left + i * stepX,
                height - padding.bottom - ((Number(d[key]) || 0) / maxValue) * graphHeight
            ])
        })
        
        return result
    }, [data, maxValue, graphHeight, graphWidth, seriesKeys])

    // Generar paths
    const paths = useMemo(() => {
        const result: { [key: string]: { line: string, area: string } } = {}
        
        Object.entries(seriesPoints).forEach(([key, points]) => {
            if (points.length === 0) return
            
            // Line path
            let line = `M ${points[0][0]} ${points[0][1]}`
            points.forEach((p, i) => { if (i > 0) line += ` L ${p[0]} ${p[1]}` })
            
            // Area path
            let area = `M ${points[0][0]} ${height - padding.bottom}`
            points.forEach(p => area += ` L ${p[0]} ${p[1]}`)
            area += ` L ${points[points.length - 1][0]} ${height - padding.bottom} Z`
            
            result[key] = { line, area }
        })
        
        return result
    }, [seriesPoints, height])

    if (!data || data.length === 0) {
        return (
            <div className={styles.chartCard} role="region" aria-label={title || t('home.temporalEvolution')}>
                <div className={styles.chartHeader}>
                    <h3 className={styles.chartTitle}>{title || t('home.temporalEvolution')}</h3>
                </div>
                <div className={styles.chartPlaceholder}>
                    <p>{t('common.noDataAvailable')}</p>
                </div>
            </div>
        )
    }

    const gridColor = dark ? "#FFFFFF" : "#000000"

    return (
        <div className={styles.chartCard} role="region" aria-label={title || t('home.temporalEvolution')}>
            <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>{title || t('home.temporalEvolution')}</h3>
                <div className={styles.chartLegend}>
                    {seriesKeys.map((key, i) => (
                        <div key={key} className={styles.legendItem}>
                            <span 
                                className={styles.legendDot} 
                                style={{ backgroundColor: getSeriesColor(key, i) }}
                            />
                            <span className={styles.legendText}>
                                {t(`home.${key}`, { defaultValue: key })}
                            </span>
                        </div>
                    ))}
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
                        {seriesKeys.map((key, i) => (
                            <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getSeriesColor(key, i)} stopOpacity={0.15} />
                                <stop offset="100%" stopColor={getSeriesColor(key, i)} stopOpacity="0.0" />
                            </linearGradient>
                        ))}
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
                                    opacity="0.1"
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

                    {/* Dibujar áreas y líneas para cada serie */}
                    {seriesKeys.map((key, i) => (
                        <g key={`series-${key}`}>
                            <path d={paths[key]?.area} fill={`url(#grad-${key})`} />
                            <path
                                d={paths[key]?.line}
                                fill="none"
                                stroke={getSeriesColor(key, i)}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                    ))}

                    {/* Puntos interactivos (basados en la primera serie o un promedio para el hover) */}
                    {data.map((_, i) => {
                        const isHovered = hoveredIndex === i
                        const x = padding.left + i * (graphWidth / (data.length - 1 || 1))
                        
                        const tooltipWidth = 140
                        const tooltipHeight = 25 + (seriesKeys.length * 18)
                        const tooltipX = Math.min(Math.max(x - tooltipWidth / 2, 8), width - tooltipWidth - 8)
                        const tooltipY = 20

                        return (
                            <g key={`interaction-${i}`}>
                                {/* Línea vertical en hover */}
                                {isHovered && (
                                    <line
                                        x1={x}
                                        y1={padding.top}
                                        x2={x}
                                        y2={height - padding.bottom}
                                        stroke={gridColor}
                                        strokeWidth="1"
                                        strokeDasharray="3 3"
                                        opacity="0.3"
                                    />
                                )}

                                {/* Trigger de hover */}
                                <rect
                                    x={x - (graphWidth / (data.length - 1 || 1)) / 2}
                                    y={padding.top}
                                    width={graphWidth / (data.length - 1 || 1)}
                                    height={graphHeight}
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={{ cursor: 'pointer' }}
                                />

                                {/* Puntos visibles en hover */}
                                {isHovered && seriesKeys.map((key, si) => {
                                    const p = seriesPoints[key][i]
                                    return (
                                        <circle
                                            key={`p-${key}-${i}`}
                                            cx={p[0]}
                                            cy={p[1]}
                                            r="5"
                                            fill={getSeriesColor(key, si)}
                                            stroke="var(--color-bg)"
                                            strokeWidth="2"
                                        />
                                    )
                                })}

                                {/* Etiquetas Eje X */}
                                {(data.length < 15 || i % Math.ceil(data.length / 10) === 0) && (
                                    <text
                                        x={x}
                                        y={height - 15}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill={gridColor}
                                        opacity="0.5"
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
                                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
                                        />
                                        <text
                                            x={tooltipX + 10}
                                            y={tooltipY + 18}
                                            fontSize="10"
                                            fontWeight="bold"
                                            fill={gridColor}
                                        >
                                            {data[i].name}
                                        </text>
                                        {seriesKeys.map((key, si) => (
                                            <g key={`tooltip-val-${key}`} transform={`translate(0, ${si * 18})`}>
                                                <circle cx={tooltipX + 15} cy={tooltipY + 36} r="3" fill={getSeriesColor(key, si)} />
                                                <text
                                                    x={tooltipX + 25}
                                                    y={tooltipY + 40}
                                                    fontSize="10"
                                                    fill={gridColor}
                                                    opacity="0.8"
                                                >
                                                    {t(`home.${key}`, { defaultValue: key })}:
                                                </text>
                                                <text
                                                    x={tooltipX + tooltipWidth - 10}
                                                    y={tooltipY + 40}
                                                    textAnchor="end"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                    fill={gridColor}
                                                >
                                                    {data[i][key]}
                                                </text>
                                            </g>
                                        ))}
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

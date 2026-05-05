import React, { useState, useMemo } from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"
import { MultiSeriesLineData } from "../types/homeTypes"

interface LineChartProps {
    data: MultiSeriesLineData[]
    title?: string
}

const buildSmoothPath = (points: [number, number][]) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`

    let path = `M ${points[0][0]} ${points[0][1]}`

    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i]
        const next = points[i + 1]
        const previous = points[i - 1] || current
        const afterNext = points[i + 2] || next
        const tension = 0.18

        const cp1x = current[0] + (next[0] - previous[0]) * tension
        const cp1y = current[1] + (next[1] - previous[1]) * tension
        const cp2x = next[0] - (afterNext[0] - current[0]) * tension
        const cp2y = next[1] - (afterNext[1] - current[1]) * tension

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next[0]} ${next[1]}`
    }

    return path
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
    const padding = { top: 20, right: 30, bottom: 48, left: 44 }

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
            
            // Line path suavizado para evitar trazos rígidos/estirados
            const line = buildSmoothPath(points)
            const lineTail = line.replace(/^M\s+[\d.-]+\s+[\d.-]+/, '')

            // Area path
            let area = `M ${points[0][0]} ${height - padding.bottom}`
            area += ` L ${points[0][0]} ${points[0][1]}`
            area += ` ${lineTail}`
            area += ` L ${points[points.length - 1][0]} ${height - padding.bottom} Z`
            
            result[key] = { line, area }
        })
        
        return result
    }, [seriesPoints, height])

    const hoveredPoint = useMemo(() => {
        if (hoveredIndex === null || !data[hoveredIndex]) return null

        const x = padding.left + hoveredIndex * (graphWidth / (data.length - 1 || 1))

        return {
            x,
            leftPercent: Math.min(Math.max((x / width) * 100, 16), 84),
            data: data[hoveredIndex],
        }
    }, [data, graphWidth, hoveredIndex])

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
                    preserveAspectRatio="xMidYMid meet"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <filter id="line-soft-glow" x="-20%" y="-30%" width="140%" height="160%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={dark ? '#000000' : '#64748b'} floodOpacity="0.22" />
                        </filter>
                        {seriesKeys.map((key, i) => (
                            <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getSeriesColor(key, i)} stopOpacity={0.22} />
                                <stop offset="55%" stopColor={getSeriesColor(key, i)} stopOpacity={0.08} />
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
                                    strokeDasharray="6 8"
                                    opacity="0.08"
                                    vectorEffect="non-scaling-stroke"
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fontWeight="600"
                                    fill={gridColor}
                                    opacity="0.65"
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
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.12"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                d={paths[key]?.line}
                                fill="none"
                                stroke={getSeriesColor(key, i)}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#line-soft-glow)"
                                vectorEffect="non-scaling-stroke"
                            />
                        </g>
                    ))}

                    {/* Puntos interactivos (basados en la primera serie o un promedio para el hover) */}
                    {data.map((_, i) => {
                        const isHovered = hoveredIndex === i
                        const x = padding.left + i * (graphWidth / (data.length - 1 || 1))

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
                                        strokeDasharray="4 6"
                                        opacity="0.22"
                                        vectorEffect="non-scaling-stroke"
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
                                            key={`halo-${key}-${i}`}
                                            cx={p[0]}
                                            cy={p[1]}
                                            r="9"
                                            fill={getSeriesColor(key, si)}
                                            opacity="0.16"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )
                                })}

                                {isHovered && seriesKeys.map((key, si) => {
                                    const p = seriesPoints[key][i]
                                    return (
                                        <circle
                                            key={`p-${key}-${i}`}
                                            cx={p[0]}
                                            cy={p[1]}
                                            r="5.5"
                                            fill={getSeriesColor(key, si)}
                                            stroke="var(--color-bg)"
                                            strokeWidth="2.5"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )
                                })}

                                {/* Etiquetas Eje X */}
                                {(data.length < 15 || i % Math.ceil(data.length / 10) === 0) && (
                                    <text
                                        x={x}
                                        y={height - 15}
                                        textAnchor="middle"
                                        fontSize="14"
                                        fontWeight="700"
                                        fill={gridColor}
                                        opacity="0.75"
                                    >
                                        {data[i].name}
                                    </text>
                                )}

                            </g>
                        )
                    })}
                </svg>

                {hoveredPoint && (
                    <div
                        className={styles.lineChartTooltip}
                        style={{ left: `${hoveredPoint.leftPercent}%` }}
                        role="status"
                        aria-live="polite"
                    >
                        <div className={styles.lineChartTooltipTitle}>{hoveredPoint.data.name}</div>
                        <div className={styles.lineChartTooltipRows}>
                            {seriesKeys.map((key, si) => (
                                <div key={`tooltip-${key}`} className={styles.lineChartTooltipRow}>
                                    <span
                                        className={styles.lineChartTooltipDot}
                                        style={{ backgroundColor: getSeriesColor(key, si) }}
                                    />
                                    <span className={styles.lineChartTooltipLabel}>
                                        {t(`home.${key}`, { defaultValue: key })}
                                    </span>
                                    <strong className={styles.lineChartTooltipValue}>
                                        {hoveredPoint.data[key]}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CustomLineChart

import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { ChartDataItem } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface WorkOrderStatusDistributionProps {
  data: ChartDataItem[]
  mode?: "status" | "priority"
}

/** Canonical rows. The API only returns categories with orders, so the panel
 * completes the set locally and shows a real `0` instead of leaving the card
 * half empty. Unknown categories coming from the API are appended as-is. */
const CATEGORY_ORDER: Record<"status" | "priority", string[]> = {
  status: ["pending", "assigned", "inProgress", "completed", "cancelled"],
  priority: ["low", "medium", "high", "critical"],
}

const normalizeName = (name: string): string => {
  const normalized = name.toLocaleLowerCase().replace(/ /g, "_")
  const aliases: Record<string, string> = {
    pendiente: "pending", asignada: "assigned", en_progreso: "inProgress",
    completada: "completed", cancelada: "cancelled", baja: "low", media: "medium",
    alta: "high", critica: "critical",
  }
  return aliases[normalized] || name
}

interface DistributionRow {
  key: string
  name: string
  value: number
}

const buildRows = (data: ChartDataItem[], mode: "status" | "priority"): DistributionRow[] => {
  const counts = new Map<string, number>()
  const labels = new Map<string, string>()
  for (const item of data) {
    const key = normalizeName(item.name)
    counts.set(key, (counts.get(key) ?? 0) + item.value)
    if (!labels.has(key)) labels.set(key, item.name)
  }
  const order = CATEGORY_ORDER[mode]
  const keys = [...order, ...[...counts.keys()].filter((key) => !order.includes(key))]
  return keys.map((key) => ({
    key,
    name: labels.get(key) ?? key,
    value: counts.get(key) ?? 0,
  }))
}

export const WorkOrderStatusDistribution = ({ data, mode = "status" }: WorkOrderStatusDistributionProps) => {
  const { t } = useTranslation()
  const [hoveredSegment, setHoveredSegment] = useState<DistributionRow | null>(null)
  const rows = buildRows(data, mode)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const title = mode === "priority" ? t("home.byPriority") : t("home.ordersByStatus")
  let offset = 0
  const segments = rows.map((row) => {
    const segment = { ...row, offset }
    offset += row.value
    return segment
  })

  const RADIUS = 56
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  let currentDonutOffset = 0
  const donutSegments = rows.map((row) => {
    const fraction = total > 0 ? row.value / total : 0
    const strokeLength = fraction * CIRCUMFERENCE
    const strokeOffset = currentDonutOffset
    currentDonutOffset += strokeLength
    return { ...row, strokeLength, strokeOffset }
  })

  return (
    <section className={styles.panel} aria-labelledby="distribution-title">
      <div className={styles.panelHeader}>
        <div><p className={styles.panelKicker}>{t("home.dashboard.distribution.kicker")}</p><h2 id="distribution-title">{title}</h2></div>
        <span className={styles.panelTotal}>{t("home.dashboard.ordersCount", { count: total })}</span>
      </div>
      {total === 0 ? (
        <p className={styles.emptyState}>{t("home.dashboard.empty.distribution")}</p>
      ) : (
        <>
          {/* viewBox uses the exact total, so a zero count keeps zero width. */}
          <svg className={styles.stackedBar} viewBox={`0 0 ${total} 1`} preserveAspectRatio="none" aria-hidden="true">
            {segments.map((segment) => (
              <rect
                key={segment.key}
                className={`${styles.stackedSegment} ${styles[`segment${segment.key}`] || styles.segmentOther}`}
                x={segment.offset}
                y={0}
                width={segment.value}
                height={1}
              />
            ))}
          </svg>
          <div className={styles.donutLayout}>
            <div className={styles.donutContainer}>
              {hoveredSegment && (
                <div className={styles.donutTooltip} role="tooltip">
                  <span className={`${styles.statusMarker} ${styles[`marker${hoveredSegment.key}`] || styles.markerOther}`} />
                  <span className={styles.donutTooltipName}>
                    {t(`home.${mode}.${hoveredSegment.key}`, { defaultValue: hoveredSegment.name })}
                  </span>
                  <span className={styles.donutTooltipValue}>
                    {hoveredSegment.value} ({total > 0 ? Math.round((hoveredSegment.value / total) * 100) : 0}%)
                  </span>
                </div>
              )}
              <svg viewBox="0 0 150 150" className={styles.donutSvg}>
                <circle cx="75" cy="75" r={RADIUS} className={styles.donutTrack} />
                {donutSegments.map((segment) => {
                  const isHovered = hoveredSegment?.key === segment.key
                  const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0
                  const label = t(`home.${mode}.${segment.key}`, { defaultValue: segment.name })
                  return (
                    <circle
                      key={segment.key}
                      cx="75"
                      cy="75"
                      r={RADIUS}
                      className={`${styles.donutSegment} ${styles[`donut${segment.key}`] || styles.donutOther} ${isHovered ? styles.donutSegmentHovered : ""}`}
                      strokeDasharray={`${segment.strokeLength} ${CIRCUMFERENCE}`}
                      strokeDashoffset={-segment.strokeOffset}
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      <title>{`${label}: ${segment.value} (${pct}%)`}</title>
                    </circle>
                  )
                })}
                <text x="75" y="65" textAnchor="middle" className={styles.donutCenterValue}>{total}</text>
                <text x="75" y="90" textAnchor="middle" className={styles.donutCenterLabel}>{t("home.dashboard.distribution.totalLabel", { defaultValue: "Total" })}</text>
              </svg>
            </div>
            <ul className={styles.distributionList}>
              {rows.map((row) => {
                const percentage = Math.round((row.value / total) * 100)
                return (
                  <li key={row.key}>
                    <span className={`${styles.statusMarker} ${styles[`marker${row.key}`] || styles.markerOther}`} />
                    <span>{t(`home.${mode}.${row.key}`, { defaultValue: row.name })}</span>
                    <strong>{row.value}</strong>
                    <span>{percentage}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

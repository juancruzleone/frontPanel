import { useTranslation } from "react-i18next"
import type { EvolutionDataItem } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface LineChartProps {
  data: EvolutionDataItem[]
}

interface Point {
  x: number
  y: number
  value: number
  label: string
}

const WIDTH = 760
const HEIGHT = 260
const PADDING = { top: 18, right: 18, bottom: 42, left: 42 }

const buildPoints = (data: EvolutionDataItem[], key: "created" | "completed", maxValue: number): Point[] => {
  const graphWidth = WIDTH - PADDING.left - PADDING.right
  const graphHeight = HEIGHT - PADDING.top - PADDING.bottom
  return data.map((item, index) => ({
    x: PADDING.left + (index * graphWidth) / Math.max(data.length - 1, 1),
    y: HEIGHT - PADDING.bottom - (item[key] / maxValue) * graphHeight,
    value: item[key],
    label: item.name,
  }))
}

const linePath = (points: Point[]): string => points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")

export const LineChart = ({ data }: LineChartProps) => {
  const { t, i18n } = useTranslation()
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.created, item.completed]))
  const createdPoints = buildPoints(data, "created", maxValue)
  const completedPoints = buildPoints(data, "completed", maxValue)
  const totals = data.reduce((result, item) => ({
    created: result.created + item.created,
    completed: result.completed + item.completed,
  }), { created: 0, completed: 0 })
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || "es", { day: "2-digit", month: "short" })
  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
  }

  return (
    <section className={`${styles.panel} ${styles.trendPanel}`} aria-labelledby="trend-title">
      <div className={styles.panelHeader}>
        <div><p className={styles.panelKicker}>{t("home.dashboard.trend.kicker")}</p><h2 id="trend-title">{t("home.temporalEvolution")}</h2></div>
        <dl className={styles.trendSummary}>
          <div><dt>{t("home.created")}</dt><dd>{totals.created}</dd></div>
          <div><dt>{t("home.completed")}</dt><dd>{totals.completed}</dd></div>
        </dl>
      </div>
      {data.length === 0 ? <p className={styles.emptyState}>{t("home.dashboard.empty.trend")}</p> : (
        <>
          <div className={styles.chartLegend} aria-hidden="true"><span className={styles.createdKey}>{t("home.created")}</span><span className={styles.completedKey}>{t("home.completed")}</span></div>
          <div className={styles.lineChartContainer}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="trend-svg-title trend-svg-description">
              <title id="trend-svg-title">{t("home.temporalEvolution")}</title>
              <desc id="trend-svg-description">{t("home.dashboard.trend.description", totals)}</desc>
              {[0, 0.5, 1].map((ratio) => {
                const y = HEIGHT - PADDING.bottom - ratio * (HEIGHT - PADDING.top - PADDING.bottom)
                return <g key={ratio}><line className={styles.gridLine} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} /><text className={styles.axisText} x={PADDING.left - 8} y={y + 4}>{Math.round(maxValue * ratio)}</text></g>
              })}
              <path className={styles.createdLine} d={linePath(createdPoints)} />
              <path className={styles.completedLine} d={linePath(completedPoints)} />
              {createdPoints.map((point, index) => (
                <g key={`points-${point.label}`}>
                  <circle className={styles.createdPoint} cx={point.x} cy={point.y} r="4" tabIndex={0} aria-label={`${formatDate(point.label)}: ${t("home.created")} ${point.value}`} />
                  <circle className={styles.completedPoint} cx={completedPoints[index].x} cy={completedPoints[index].y} r="4" tabIndex={0} aria-label={`${formatDate(point.label)}: ${t("home.completed")} ${completedPoints[index].value}`} />
                  {(data.length <= 8 || index % Math.ceil(data.length / 7) === 0) && <text className={styles.xAxisText} x={point.x} y={HEIGHT - 14}>{formatDate(point.label)}</text>}
                </g>
              ))}
            </svg>
          </div>
          <details className={styles.chartDataTable}>
            <summary>{t("home.dashboard.trend.tableToggle")}</summary>
            <table>
              <caption>{t("home.dashboard.trend.tableCaption")}</caption>
              <thead><tr><th scope="col">{t("home.dashboard.date")}</th><th scope="col">{t("home.created")}</th><th scope="col">{t("home.completed")}</th></tr></thead>
              <tbody>{data.map((item) => <tr key={item.name}><th scope="row">{formatDate(item.name)}</th><td>{item.created}</td><td>{item.completed}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}

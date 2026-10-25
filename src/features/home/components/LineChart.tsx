import { useTranslation } from "react-i18next"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { Table, ArrowRight } from "lucide-react"
import type { EvolutionDataItem } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface LineChartProps {
  data: EvolutionDataItem[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className={styles.chartTooltip}>
      <p className={styles.chartTooltipDate}>{label}</p>
      <div className={styles.chartTooltipRows}>
        {payload.map((entry) => (
          <div key={entry.dataKey} className={styles.chartTooltipRow}>
            <span className={styles.chartTooltipDot} style={{ backgroundColor: entry.color }} />
            <span className={styles.chartTooltipLabel}>{entry.name}:</span>
            <span className={styles.chartTooltipValue}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const LineChart = ({ data }: LineChartProps) => {
  const { t, i18n } = useTranslation()

  const totals = data.reduce(
    (result, item) => ({
      created: result.created + item.created,
      completed: result.completed + item.completed,
    }),
    { created: 0, completed: 0 },
  )

  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || "es", {
    day: "2-digit",
    month: "short",
  })

  const formatDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
  }

  const chartData = data.map((item) => ({
    ...item,
    formattedDate: formatDate(item.name),
  }))

  return (
    <section className={`${styles.panel} ${styles.trendPanel}`} aria-labelledby="trend-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>{t("home.dashboard.trend.kicker")}</p>
          <h2 id="trend-title">{t("home.temporalEvolution")}</h2>
          <p className={styles.panelSubtitle}>
            {t("home.dashboard.trend.subtitle", { defaultValue: "Órdenes creadas y completadas en el período seleccionado." })}
          </p>
        </div>

        <div className={styles.trendMetricsGroup}>
          <div className={styles.trendMetricItem}>
            <span className={styles.trendMetricLabel}>{t("home.created")}</span>
            <strong className={styles.trendMetricNumber}>{totals.created}</strong>
            <span className={styles.trendMetricDeltaUp}>↑ 25% vs. período anterior</span>
          </div>
          <div className={styles.trendMetricDivider} aria-hidden />
          <div className={styles.trendMetricItem}>
            <span className={styles.trendMetricLabel}>{t("home.completed")}</span>
            <strong className={styles.trendMetricNumber}>{totals.completed}</strong>
            <span className={styles.trendMetricDeltaDown}>↓ 50% vs. período anterior</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p className={styles.emptyState}>{t("home.dashboard.empty.trend")}</p>
      ) : (
        <>
          <div className={styles.chartToolbar}>
            <div className={styles.chartLegend} aria-hidden="true">
              <span className={styles.createdKey}>
                <span className={styles.legendColorCreated} />
                <span>{t("home.created")}</span>
              </span>
              <span className={styles.completedKey}>
                <span className={styles.legendColorCompleted} />
                <span>{t("home.completed")}</span>
              </span>
            </div>
            <div className={styles.chartRangeBadge}>
              <span>{t("home.range.30d", { defaultValue: "Últimos 30 días" })}</span>
            </div>
          </div>

          <div className={styles.rechartsWrapper}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 16, right: 16, left: -20, bottom: 4 }}>
                <defs>
                  <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#087F70" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#087F70" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-card-border)" />
                <XAxis
                  dataKey="formattedDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 3)]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="created"
                  name={t("home.created")}
                  stroke="#087F70"
                  strokeWidth={2}
                  fill="url(#gradientCreated)"
                  dot={{ r: 3.5, fill: "var(--color-card)", stroke: "#087F70", strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: "#087F70", stroke: "#ffffff", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name={t("home.completed")}
                  stroke="#8494A7"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: "var(--color-card)", stroke: "#8494A7", strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: "#8494A7", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <details className={styles.chartDataTable}>
            <summary>
              <Table size={15} className={styles.chartTableIcon} aria-hidden />
              <span>{t("home.dashboard.trend.tableToggle")}</span>
              <ArrowRight size={13} aria-hidden />
            </summary>
            <table>
              <caption>{t("home.dashboard.trend.tableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("home.dashboard.date")}</th>
                  <th scope="col">{t("home.created")}</th>
                  <th scope="col">{t("home.completed")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.name}>
                    <th scope="row">{formatDate(item.name)}</th>
                    <td>{item.created}</td>
                    <td>{item.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  )
}

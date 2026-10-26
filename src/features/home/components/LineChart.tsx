import { useMemo } from "react"
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
import { Table } from "lucide-react"
import HybridSelect from "../../../shared/components/HybridSelect"
import type { EvolutionDataItem, RangeOption } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface LineChartProps {
  data: EvolutionDataItem[]
  range?: RangeOption
  onRangeChange?: (range: RangeOption) => void
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

export const LineChart = ({ data, range = "30d", onRangeChange }: LineChartProps) => {
  const { t, i18n } = useTranslation()

  const chartData = useMemo(() => {
    const locale = i18n.resolvedLanguage || "es"
    const now = new Date()

    if (range === "7d") {
      const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "long" })
      const dayMap = new Map<string, { created: number; completed: number }>()

      for (const item of data) {
        dayMap.set(item.name.slice(0, 10), { created: item.created, completed: item.completed })
      }

      const points: Array<{ name: string; formattedDate: string; created: number; completed: number }> = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().slice(0, 10)
        const found = dayMap.get(dateKey) || { created: 0, completed: 0 }
        const rawWeekday = weekdayFormatter.format(d)
        const formattedDate = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
        points.push({
          name: dateKey,
          formattedDate,
          created: found.created,
          completed: found.completed,
        })
      }
      return points
    }

    if (range === "12m") {
      const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" })
      const monthMap = new Map<string, { created: number; completed: number }>()

      for (const item of data) {
        const monthKey = item.name.slice(0, 7)
        const existing = monthMap.get(monthKey) || { created: 0, completed: 0 }
        monthMap.set(monthKey, {
          created: existing.created + item.created,
          completed: existing.completed + item.completed,
        })
      }

      const points: Array<{ name: string; formattedDate: string; created: number; completed: number }> = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const found = monthMap.get(monthKey) || { created: 0, completed: 0 }
        const rawMonth = monthFormatter.format(d)
        const formattedDate = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)
        points.push({
          name: monthKey,
          formattedDate,
          created: found.created,
          completed: found.completed,
        })
      }
      return points
    }

    const defaultDateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" })
    return data.map((item) => {
      const d = new Date(`${item.name}T00:00:00`)
      const formattedDate = Number.isNaN(d.getTime()) ? item.name : defaultDateFormatter.format(d)
      return {
        ...item,
        formattedDate,
      }
    })
  }, [data, range, i18n.resolvedLanguage])

  const totals = useMemo(() => {
    return chartData.reduce(
      (result, item) => ({
        created: result.created + item.created,
        completed: result.completed + item.completed,
      }),
      { created: 0, completed: 0 },
    )
  }, [chartData])

  const rangeOptions = useMemo(() => [
    { value: "7d", label: t("home.range.7d", { defaultValue: "Últimos 7 días" }) },
    { value: "30d", label: t("home.range.30d", { defaultValue: "Últimos 30 días" }) },
    { value: "90d", label: t("home.range.90d", { defaultValue: "Últimos 90 días" }) },
    { value: "12m", label: t("home.range.12m", { defaultValue: "Últimos 12 meses" }) },
  ], [t])

  return (
    <section className={`${styles.panel} ${styles.trendPanel}`} aria-labelledby="trend-title">
      <div className={styles.panelHeader}>
        <div className={styles.trendHeaderInfo}>
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
          </div>
          <div className={styles.trendMetricDivider} aria-hidden />
          <div className={styles.trendMetricItem}>
            <span className={styles.trendMetricLabel}>{t("home.completed")}</span>
            <strong className={styles.trendMetricNumber}>{totals.completed}</strong>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <p className={styles.emptyState}>{t("home.dashboard.empty.trend")}</p>
      ) : (
        <>
          <div className={styles.chartToolbar}>
            <div className={styles.chartLegend} aria-hidden="true">
              <span className={styles.createdKey}>{t("home.created")}</span>
              <span className={styles.completedKey}>{t("home.completed")}</span>
            </div>
            <HybridSelect
              value={range}
              onChange={(val) => onRangeChange?.(val as RangeOption)}
              options={rangeOptions}
              variant="compact"
            />
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
                {chartData.map((item) => (
                  <tr key={item.name}>
                    <th scope="row">{item.formattedDate}</th>
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

import React from "react"
import { useTranslation } from "react-i18next"
import type { EvolutionPoint } from "../utils/tenantStats"
import home from "../../home/styles/home.module.css"

interface TenantLineChartProps {
  points: EvolutionPoint[]
  totalLabel?: string
}

const WIDTH = 760
const HEIGHT = 260
const PADDING = { top: 18, right: 18, bottom: 42, left: 42 }

function buildPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
}

const TenantLineChart: React.FC<TenantLineChartProps> = ({ points }) => {
  const { t } = useTranslation()
  const total = points.reduce((s, p) => s + p.value, 0)
  const nonZeroCount = points.filter(p => p.value > 0).length
  const needsPlaceholder = nonZeroCount < 2

  const maxValue = Math.max(1, ...points.map(p => p.value))
  const graphWidth = WIDTH - PADDING.left - PADDING.right
  const graphHeight = HEIGHT - PADDING.top - PADDING.bottom

  const chartPoints = points.map((p, idx) => ({
    x: PADDING.left + (idx * graphWidth) / Math.max(points.length - 1, 1),
    y: HEIGHT - PADDING.bottom - (p.value / maxValue) * graphHeight,
    value: p.value,
    label: p.label,
    name: p.name,
  }))

  const placeholderAria = t('superAdmin.dashboard.evolution.description', { defaultValue: `${total} tenants en los últimos ${points.length} meses`, count: total, months: points.length })

  if (needsPlaceholder) {
    return (
      <section className={`${home.panel} ${home.trendPanel}`} aria-label={t('superAdmin.dashboard.evolution.title', { defaultValue: 'Evolución de tenants' })} role="region">
        <div className={home.panelHeader}>
          <div>
            <p className={home.panelKicker}>{t('superAdmin.dashboard.evolution.kicker', { defaultValue: 'Altas' })}</p>
            <h2>{t('superAdmin.dashboard.evolution.title', { defaultValue: 'Evolución de tenants' })}</h2>
          </div>
          <span className={home.panelTotal}>{total} total</span>
        </div>
        <p className={home.emptyState}>Sin datos aún</p>
        <details className={home.chartDataTable}>
          <summary>{t('superAdmin.dashboard.evolution.tableToggle', { defaultValue: 'Ver datos en tabla' })}</summary>
          <table>
            <caption>{t('superAdmin.dashboard.evolution.tableCaption', { defaultValue: 'Altas de tenants por mes' })}</caption>
            <thead><tr><th scope="col">Mes</th><th scope="col">Tenants</th></tr></thead>
            <tbody>{points.map(p => <tr key={p.name}><th scope="row">{p.label}</th><td>{p.value}</td></tr>)}</tbody>
          </table>
        </details>
      </section>
    )
  }

  return (
    <section className={`${home.panel} ${home.trendPanel}`} aria-label={t('superAdmin.dashboard.evolution.aria', { defaultValue: placeholderAria })} role="region">
      <div className={home.panelHeader}>
        <div>
          <p className={home.panelKicker}>{t('superAdmin.dashboard.evolution.kicker', { defaultValue: 'Altas' })}</p>
          <h2 id="trend-title">{t('superAdmin.dashboard.evolution.title', { defaultValue: 'Evolución de tenants' })}</h2>
        </div>
        <span className={home.panelTotal}>{total} total</span>
      </div>

      <div className={home.lineChartContainer}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="evo-title evo-desc">
          <title id="evo-title">{t('superAdmin.dashboard.evolution.title', { defaultValue: 'Evolución de tenants' })}</title>
          <desc id="evo-desc">{placeholderAria}</desc>
          {[0, 0.5, 1].map(ratio => {
            const y = HEIGHT - PADDING.bottom - ratio * graphHeight
            return (
              <g key={ratio}>
                <line className={home.gridLine} x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} />
                <text className={home.axisText} x={PADDING.left - 8} y={y + 4}>{Math.round(maxValue * ratio)}</text>
              </g>
            )
          })}
          <path className={home.createdLine} d={buildPath(chartPoints)} style={{ stroke: 'var(--color-secondary)' }} />
          {chartPoints.map((p) => (
            <g key={p.name}>
              <circle className={home.createdPoint} cx={p.x} cy={p.y} r={4} tabIndex={0} aria-label={`${p.label}: ${p.value}`} style={{ stroke: 'var(--color-secondary)' }} />
              <text className={home.xAxisText} x={p.x} y={HEIGHT - 14}>{p.label}</text>
            </g>
          ))}
        </svg>
      </div>

      <details className={home.chartDataTable}>
        <summary>{t('superAdmin.dashboard.evolution.tableToggle', { defaultValue: 'Ver datos en tabla' })}</summary>
        <table>
          <caption>{t('superAdmin.dashboard.evolution.tableCaption', { defaultValue: 'Altas de tenants por mes' })}</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col">Tenants</th></tr></thead>
          <tbody>{points.map(p => <tr key={p.name}><th scope="row">{p.label}</th><td>{p.value}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  )
}

export default TenantLineChart

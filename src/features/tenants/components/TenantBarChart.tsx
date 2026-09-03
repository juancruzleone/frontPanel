import React from "react"
import { useTranslation } from "react-i18next"
import type { DistributionBucket } from "../utils/tenantStats"
import home from "../../home/styles/home.module.css"

interface TenantBarChartProps {
  title: string
  kicker?: string
  buckets: DistributionBucket[]
  colorOf?: (key: string) => string
  total?: number
  ariaLabel?: string
}

const defaultColorOf = (key: string): string => {
  const map: Record<string, string> = {
    basic: "var(--chart-basic, #64748b)",
    professional: "var(--chart-professional, #057E74)",
    enterprise: "var(--chart-enterprise, #fbc02d)",
    unknown: "var(--chart-unknown, #64748b)",
    active: "var(--chart-active, #047857)",
    suspended: "var(--chart-suspended, #ca8a04)",
    cancelled: "var(--chart-cancelled, #b91c1c)",
  }
  return map[key] ?? "var(--chart-unknown, #64748b)"
}

const labelMap: Record<string, string> = {
  basic: "Básico",
  professional: "Profesional",
  enterprise: "Empresarial",
  unknown: "Sin plan",
  active: "Activo",
  suspended: "Suspendido",
  cancelled: "Cancelado",
}

const statusUnknownLabel = "Sin estado"

const TenantBarChart: React.FC<TenantBarChartProps> = ({ title, kicker, buckets, colorOf = defaultColorOf, total: totalProp, ariaLabel }) => {
  const { t } = useTranslation()
  const total = totalProp ?? buckets.reduce((s, b) => s + b.value, 0)
  const visible = buckets.filter(b => b.value > 0)

  if (total === 0 || buckets.length === 0) {
    return (
      <section className={home.panel} role="region" aria-label={ariaLabel ?? t('superAdmin.dashboard.distribution.aria.plan', { defaultValue: title })}>
        <div className={home.panelHeader}>
          <div>
            {kicker && <p className={home.panelKicker}>{kicker}</p>}
            <h2>{title}</h2>
          </div>
          <span className={home.panelTotal}>{total} total</span>
        </div>
        <p className={home.emptyState}>Sin datos aún</p>
      </section>
    )
  }

  const distAria = ariaLabel ?? title

  return (
    <section className={home.panel} role="region" aria-label={distAria}>
      <div className={home.panelHeader}>
        <div>
          {kicker && <p className={home.panelKicker}>{kicker}</p>}
          <h2 id={`dist-${title}`}>{title}</h2>
        </div>
        <span className={home.panelTotal}>{t('superAdmin.dashboard.distribution.total', { defaultValue: `${total} tenants`, count: total })}</span>
      </div>

      <div className={home.stackedBar} aria-hidden="true">
        {visible.map((b) => (
          <span
            key={b.key}
            className={home.stackedSegment}
            data-size={Math.max(1, Math.round((b.value / total) * 10))}
            style={{ background: colorOf(b.key) }}
            aria-hidden="true"
          />
        ))}
      </div>

      <ul className={home.distributionList}>
        {visible.map((b) => {
          const pct = total > 0 ? Math.round((b.value / total) * 100) : 0
          let label = labelMap[b.key] ?? b.key
          if (b.key === 'unknown' && /estado|status/i.test(title)) label = statusUnknownLabel
          return (
            <li key={b.key}>
              <span className={home.statusMarker} style={{ background: colorOf(b.key) }} />
              <span>{label}</span>
              <strong>{b.value}</strong>
              <span>{pct}%</span>
            </li>
          )
        })}
      </ul>
      {/* hidden unknown bucket still sums to total; visible filter hides zero but unknown with value>0 is shown */}
    </section>
  )
}

export default TenantBarChart

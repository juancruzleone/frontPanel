import React from "react"
import { useTranslation } from "react-i18next"
import { formatCount } from "../utils/tenantStats"
import home from "../../home/styles/home.module.css"

interface TenantStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalAssets: number
}

interface TenantStatsCardsProps {
  stats?: TenantStats
  metrics?: { id: 'totalTenants' | 'activeTenants' | 'totalUsers' | 'totalAssets'; value: number }[]
}

const TenantStatsCards: React.FC<TenantStatsCardsProps> = ({ stats, metrics }) => {
  const { t } = useTranslation()
  const resolved: { id: 'totalTenants' | 'activeTenants' | 'totalUsers' | 'totalAssets'; value: number }[] =
    metrics ??
    (stats
      ? [
          { id: 'totalTenants', value: stats.totalTenants },
          { id: 'activeTenants', value: stats.activeTenants },
          { id: 'totalUsers', value: stats.totalUsers },
          { id: 'totalAssets', value: stats.totalAssets },
        ]
      : [])

  const labels: Record<string, string> = {
    totalTenants: t('superAdmin.dashboard.kpi.totalTenants', { defaultValue: 'Total Tenants' }),
    activeTenants: t('superAdmin.dashboard.kpi.activeTenants', { defaultValue: 'Active Tenants' }),
    totalUsers: t('superAdmin.dashboard.kpi.totalUsers', { defaultValue: 'Users' }),
    totalAssets: t('superAdmin.dashboard.kpi.totalAssets', { defaultValue: 'Assets' }),
  }

  return (
    <dl className={home.kpiBand} aria-label={t('superAdmin.dashboard.kpi.aria', { defaultValue: 'Key metrics' })}>
      {resolved.map((kpi) => (
        <div className={home.kpiCell} key={kpi.id} aria-label={`${labels[kpi.id]}: ${formatCount(kpi.value)}`}>
          <dt>{labels[kpi.id]}</dt>
          <dd aria-live="polite">{formatCount(kpi.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default TenantStatsCards

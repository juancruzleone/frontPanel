import React from "react"
import { useTranslation } from "react-i18next"
import usePanelAdminDashboard from "../features/tenants/hooks/usePanelAdminDashboard"
import TenantStatsCards from "../features/tenants/components/TenantStatsCards"
import TenantBarChart from "../features/tenants/components/TenantBarChart"
import TenantLineChart from "../features/tenants/components/TenantLineChart"
import RecentTenants from "../features/tenants/components/RecentTenants"
import PanelSkeleton from "../features/tenants/components/PanelSkeleton"
import { Shield } from "lucide-react"
import styles from "../features/tenants/styles/panelAdmin.module.css"
import home from "../features/home/styles/home.module.css"
import { Link } from "react-router"
import { useTranslatedRoutes } from "../router"

const PanelAdmin: React.FC = () => {
  const { t } = useTranslation()
  const { stats, meta, loading, refreshing, error, lastUpdated, retry } = usePanelAdminDashboard() as any
  const { getRoute } = useTranslatedRoutes()

  // normalize error: new shape {kind,messageKey} vs old string
  const errorMessage: string | null = error
    ? (typeof error === 'string' ? error : t(error.messageKey, { defaultValue: 'Error al cargar los datos del panel' }))
    : null
  const isError = Boolean(error)

  // support both old and new stats shapes
  const planBuckets = Array.isArray((stats as any).planDistribution)
    ? (stats as any).planDistribution
    : [
        { key: 'basic', value: (stats as any).planDistribution?.basic ?? 0 },
        { key: 'professional', value: (stats as any).planDistribution?.professional ?? 0 },
        { key: 'enterprise', value: (stats as any).planDistribution?.enterprise ?? 0 },
      ]

  const statusBuckets = Array.isArray((stats as any).statusDistribution)
    ? (stats as any).statusDistribution
    : [
        { key: 'active', value: (stats as any).statusDistribution?.active ?? 0 },
        { key: 'suspended', value: (stats as any).statusDistribution?.suspended ?? 0 },
        { key: 'cancelled', value: (stats as any).statusDistribution?.cancelled ?? 0 },
      ]

  const evolutionPoints = (stats as any).evolutionData ?? []

  return (
    <div className={home.dashboardContainer}>
      <header className={home.dashboardHeader}>
        <div className={home.headerCopy}>
          <p className={home.eyebrow}>{t('superAdmin.dashboard.eyebrow', { defaultValue: 'Global scope' })}</p>
          <h1>{t(['superAdmin.dashboard.title', 'panelAdmin.title'] as any, { defaultValue: 'Panel de administración' })}</h1>
          <p className={home.subtitle}>{t(['superAdmin.dashboard.subtitle', 'panelAdmin.subtitle'] as any, { defaultValue: 'Gestión centralizada de tenants y recursos del sistema' })}</p>
          <dl className={home.headerMetadata}>
            <div>
              <dt>{t('superAdmin.dashboard.scopeLabel', { defaultValue: 'Scope' })}</dt>
              <dd>{t('superAdmin.dashboard.scope.global', { defaultValue: 'All tenants' })}</dd>
            </div>
            <div>
              <dt>{t('superAdmin.dashboard.kpi.totalTenants', { defaultValue: 'Tenants' })}</dt>
              <dd>{stats.totalTenants}</dd>
            </div>
            {lastUpdated && (
              <div>
                <dt>{t('superAdmin.dashboard.updated', { defaultValue: 'Actualizado' })}</dt>
                <dd>{new Date(lastUpdated).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className={home.headerActions}>
          <Link to={getRoute('tenants')} className={home.panelAction}>
            <Shield size={18} />
            <span>{t('nav.audit')}</span>
          </Link>
        </div>
      </header>

      {meta?.truncated && (
        <div className={home.dataNotices} role="status">
          <p>{t('superAdmin.dashboard.notices.truncated', { defaultValue: `Se analizaron ${meta.pages} páginas (${meta.total} tenants); la vista puede estar incompleta.`, pages: meta.pages, count: meta.total })}</p>
        </div>
      )}

      {loading ? (
        <PanelSkeleton refreshing={refreshing} />
      ) : isError ? (
        <section className={home.fullError} role="alert">
          <h2>{t('superAdmin.dashboard.errors.title', { defaultValue: 'No pudimos mostrar el panel' })}</h2>
          <p>{errorMessage}</p>
          <button onClick={() => retry?.()}>{t('common.retry', { defaultValue: 'Reintentar' })}</button>
        </section>
      ) : (
        <main className={styles.dashboardContent} data-refreshing={refreshing ? 'true' : undefined}>
          <section className={styles.kpisSection} aria-labelledby="kpis-title">
            <h2 id="kpis-title" className={home.sectionHeading}>{t('superAdmin.dashboard.sections.immediate', { defaultValue: 'Métricas globales y excepciones' })}</h2>
            <TenantStatsCards stats={{
              totalTenants: stats.totalTenants,
              activeTenants: stats.activeTenants,
              totalUsers: stats.totalUsers,
              totalAssets: stats.totalAssets
            }} />
          </section>

          <section aria-labelledby="analysis-title">
            <h2 id="analysis-title" className={home.sectionHeading}>{t('superAdmin.dashboard.sections.analysis', { defaultValue: 'Evolución y planes' })}</h2>
            <div className={home.analysisGrid}>
              <TenantLineChart points={evolutionPoints} />
              <TenantBarChart
                title={t('superAdmin.dashboard.distribution.planTitle', { defaultValue: 'Planes' })}
                kicker={t('superAdmin.dashboard.distribution.kicker', { defaultValue: 'Composición' })}
                buckets={planBuckets}
                ariaLabel={t('superAdmin.dashboard.distribution.aria.plan', { defaultValue: 'Distribución por planes' })}
              />
            </div>
          </section>

          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className={home.sectionHeading}>{t('superAdmin.dashboard.sections.recent', { defaultValue: 'Tenants recientes' })}</h2>
            <div className={home.workGrid}>
              <div style={{ gridColumn: 'span 8' }}>
                <RecentTenants tenants={(stats as any).recentTenants ?? []} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <TenantBarChart
                  title={t('superAdmin.dashboard.distribution.statusTitle', { defaultValue: 'Estados' })}
                  kicker={t('superAdmin.dashboard.distribution.kicker', { defaultValue: 'Composición' })}
                  buckets={statusBuckets}
                  ariaLabel={t('superAdmin.dashboard.distribution.aria.status', { defaultValue: 'Distribución por estados' })}
                />
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default PanelAdmin

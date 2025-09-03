import React from "react"
import { useTranslation } from "react-i18next"
import usePanelAdminDashboard from "../features/tenants/hooks/usePanelAdminDashboard"
import TenantStatsCards from "../features/tenants/components/TenantStatsCards"
import TenantBarChart from "../features/tenants/components/TenantBarChart"
import TenantPieChart from "../features/tenants/components/TenantPieChart"
import TenantLineChart from "../features/tenants/components/TenantLineChart"
import RecentTenants from "../features/tenants/components/RecentTenants"
import styles from "../features/tenants/styles/panelAdmin.module.css"

const Skeleton = ({ height = 40, width = '100%', style = {} }) => (
  <div
    className={styles.skeleton}
    style={{ height, width, ...style }}
    aria-hidden="true"
  />
)

const PanelAdmin: React.FC = () => {
  const { t } = useTranslation()
  const { stats, loading, error } = usePanelAdminDashboard()

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <h1 className={styles.title}>{t('panelAdmin.title')}</h1>
        <p className={styles.subtitle}>{t('panelAdmin.subtitle')}</p>
      </header>
      
      {loading ? (
        <div className={styles.loadingContainer}>
          {/* Skeletons mejorados */}
          <div className={styles.skeletonGrid}>
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
            <Skeleton height={160} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          </div>
          <Skeleton height={220} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          <Skeleton height={220} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
          <Skeleton height={220} width={"100%"} style={{borderRadius: 16, marginBottom: 24}} />
        </div>
      ) : error ? (
        <div className={styles.errorContainer} role="alert">
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.error}>{error}</div>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <main className={styles.dashboardContent}>
          {/* Sección de KPIs */}
          <section className={styles.kpisSection} aria-labelledby="kpis-title">
            <h2 id="kpis-title" className={styles.sectionTitle}>Métricas Principales</h2>
            <TenantStatsCards stats={{
              totalTenants: stats.totalTenants,
              activeTenants: stats.activeTenants,
              totalUsers: stats.totalUsers,
              totalAssets: stats.totalAssets
            }} />
          </section>

          {/* Sección de gráficos */}
          <section className={styles.chartsSection} aria-labelledby="charts-title">
            <h2 id="charts-title" className={styles.sectionTitle}>Análisis de Datos</h2>
            <div className={styles.chartsRow}>
              <TenantBarChart data={[
                { name: 'basic', value: stats.planDistribution.basic, color: '#1976d2' },
                { name: 'professional', value: stats.planDistribution.professional, color: '#057E74' },
                { name: 'enterprise', value: stats.planDistribution.enterprise, color: '#fbc02d' }
              ]} />
              <TenantPieChart data={[
                { name: 'active', value: stats.statusDistribution.active, color: '#10b981' },
                { name: 'suspended', value: stats.statusDistribution.suspended, color: '#f59e0b' },
                { name: 'cancelled', value: stats.statusDistribution.cancelled, color: '#ef4444' }
              ]} />
            </div>
          </section>

          {/* Gráfico de línea */}
          <section className={styles.lineChartSection} aria-labelledby="trend-title">
            <h2 id="trend-title" className={styles.sectionTitle}>Evolución de Tenants</h2>
            <TenantLineChart data={stats.evolutionData} />
          </section>

          {/* Tenants recientes */}
          <section className={styles.recentSection} aria-labelledby="recent-title">
            <h2 id="recent-title" className={styles.sectionTitle}>Tenants Recientes</h2>
            <RecentTenants tenants={stats.recentTenants} />
          </section>
        </main>
      )}
    </div>
  )
}

export default PanelAdmin 
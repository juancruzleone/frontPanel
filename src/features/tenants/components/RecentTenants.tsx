import React from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { useTranslatedRoutes } from "../../../router"
import { Tenant } from "../types/tenant.types"
import home from "../../home/styles/home.module.css"
import panel from "../styles/panelAdmin.module.css"

interface RecentTenantsProps {
  tenants: Tenant[]
}

const RecentTenants: React.FC<RecentTenantsProps> = ({ tenants }) => {
  const { t } = useTranslation()
  const { getRoute } = useTranslatedRoutes()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string | null | undefined) => {
    const s = String(status ?? 'unknown').toLowerCase()
    switch (s) {
      case 'active':
      case 'activo':
        return 'var(--chart-active, #047857)'
      case 'suspended':
      case 'suspendido':
        return 'var(--chart-suspended, #ca8a04)'
      case 'cancelled':
      case 'cancelado':
        return 'var(--chart-cancelled, #b91c1c)'
      default:
        return 'var(--chart-unknown, #64748b)'
    }
  }

  const translatePlan = (plan: string | null | undefined) => {
    if (!plan) return t('superAdmin.dashboard.distribution.plans.unknown', { defaultValue: 'Sin plan' })
    switch (plan.toLowerCase()) {
      case 'basic':
        return t('superAdmin.dashboard.distribution.plans.basic', { defaultValue: 'Básico' })
      case 'professional':
        return t('superAdmin.dashboard.distribution.plans.professional', { defaultValue: 'Profesional' })
      case 'enterprise':
        return t('superAdmin.dashboard.distribution.plans.enterprise', { defaultValue: 'Empresarial' })
      default:
        return plan
    }
  }

  // ensure newest desc and max 5
  const sorted = [...(tenants ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (!tenants || tenants.length === 0) {
    return (
      <section className={home.panel} aria-label={t('superAdmin.dashboard.recent.title', { defaultValue: 'Tenants recientes' })}>
        <div className={home.panelHeader}>
          <div>
            <p className={home.panelKicker}>{t('superAdmin.dashboard.recent.kicker', { defaultValue: 'Últimos registros' })}</p>
            <h2>{t('superAdmin.dashboard.recent.title', { defaultValue: 'Tenants recientes' })}</h2>
          </div>
          <span className={home.panelTotal}>0 total</span>
        </div>
        <p className={home.emptyState}>{t('superAdmin.dashboard.recent.empty', { defaultValue: 'No hay tenants registrados' })}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <Link to={getRoute('tenants')} className={panel.createCta}>
            {t('superAdmin.dashboard.recent.createCta', { defaultValue: 'Crear tenant' })}
          </Link>
          <Link to={getRoute('tenants')} className={panel.createCta}>
            {t('superAdmin.dashboard.recent.manageCta', { defaultValue: 'Gestionar tenants' })}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={home.panel} aria-label={t('superAdmin.dashboard.recent.title', { defaultValue: 'Tenants recientes' })}>
      <div className={home.panelHeader}>
        <div>
          <p className={home.panelKicker}>{t('superAdmin.dashboard.recent.kicker', { defaultValue: 'Últimos registros' })}</p>
          <h2>{t('superAdmin.dashboard.recent.title', { defaultValue: 'Tenants recientes' })}</h2>
        </div>
        <span className={home.panelTotal}>{t('superAdmin.dashboard.distribution.total', { defaultValue: `${tenants.length} tenants`, count: tenants.length })}</span>
      </div>

      <ol className={home.ordersList}>
        {sorted.map((tenant) => (
          <li key={tenant._id} className={home.orderItem}>
            <div>
              <strong>{tenant.name}</strong>
              <span>
                {translatePlan(tenant.plan)} • {t('superAdmin.dashboard.recent.createdAt', { defaultValue: 'Alta' })}: {formatDate(tenant.createdAt)}
              </span>
            </div>
            <div className={home.orderMeta}>
              <span
                className={`${home.orderStatus} ${panel.tagChip}`}
                style={{ background: getStatusColor(tenant.status), color: 'white', borderColor: 'var(--color-card-border)' }}
              >
                {tenant.status ?? t('superAdmin.dashboard.distribution.statuses.unknown', { defaultValue: 'Sin estado' })}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 12 }}>
        <Link to={getRoute('tenants')} className={panel.createCta}>
          {t('superAdmin.dashboard.recent.manageCta', { defaultValue: 'Gestionar tenants' })}
        </Link>
      </div>
    </section>
  )
}

export default RecentTenants

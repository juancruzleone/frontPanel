import React from "react"
import { Calendar, Building, Users } from "lucide-react"
import { Tenant } from "../types/tenant.types"
import styles from "../styles/panelAdmin.module.css"

interface RecentTenantsProps {
  tenants: Tenant[]
}

const RecentTenants: React.FC<RecentTenantsProps> = ({ tenants }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'activo':
        return '#10b981'
      case 'suspended':
      case 'suspendido':
        return '#f59e0b'
      case 'cancelled':
      case 'cancelado':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const translatePlan = (plan: string | null) => {
    if (!plan) return 'Sin plan'
    
    switch (plan.toLowerCase()) {
      case 'basic':
        return 'Básico'
      case 'professional':
        return 'Profesional'
      case 'enterprise':
        return 'Empresarial'
      default:
        return plan
    }
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className={styles.recentTenantsCard}>
        <div className={styles.recentTenantsHeader}>
          <h3 className={styles.recentTenantsTitle}>Tenants Recientes</h3>
          <span className={styles.recentTenantsCount}>0 total</span>
        </div>
        <div className={styles.noTenants}>
          <div className={styles.noTenantsIcon}>🏢</div>
          <p>No hay tenants registrados</p>
          <small>Crea el primer tenant para comenzar</small>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.recentTenantsCard}>
      <div className={styles.recentTenantsHeader}>
        <h3 className={styles.recentTenantsTitle}>Tenants Recientes</h3>
        <span className={styles.recentTenantsCount}>{tenants.length} total</span>
      </div>
      
      <div className={styles.tenantsList}>
        {tenants.map((tenant) => (
          <div key={tenant._id} className={styles.tenantItem}>
            <div className={styles.tenantHeader}>
              <h4 className={styles.tenantTitle}>{tenant.name}</h4>
              <div className={styles.tenantMeta}>
                <span 
                  className={styles.tenantStatus}
                  style={{ backgroundColor: getStatusColor(tenant.status) }}
                >
                  {tenant.status}
                </span>
              </div>
            </div>
            
            <div className={styles.tenantInfo}>
              <div className={styles.tenantDetail}>
                <Building size={16} />
                <span>Plan: {translatePlan(tenant.plan)}</span>
              </div>
              <div className={styles.tenantDetail}>
                <Users size={16} />
                <span>Usuarios: {tenant.stats?.totalUsers || 0} / {tenant.maxUsers}</span>
              </div>
              <div className={styles.tenantDetail}>
                <Calendar size={16} />
                <span>Fecha de Creación: {formatDate(tenant.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentTenants 
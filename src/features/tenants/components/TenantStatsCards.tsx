import React from "react"
import { Users, Building, Database, TrendingUp } from "lucide-react"
import styles from "../styles/panelAdmin.module.css"

interface TenantStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalAssets: number
}

interface TenantStatsCardsProps {
  stats: TenantStats
}

const TenantStatsCards: React.FC<TenantStatsCardsProps> = ({ stats }) => {
  const kpis = [
    {
      label: 'Total de Tenants',
      value: stats.totalTenants,
      icon: Database,
      color: '#3b82f6'
    },
    {
      label: 'Tenants Activos',
      value: stats.activeTenants,
      icon: Building,
      color: '#10b981'
    },
    {
      label: 'Total de Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: '#f59e0b'
    },
    {
      label: 'Total de Activos',
      value: stats.totalAssets,
      icon: TrendingUp,
      color: '#8b5cf6'
    }
  ]
  
  return (
    <div className={styles.statsCardsRow} role="region" aria-label="Métricas principales">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <div 
            className={styles.statsCard} 
            key={kpi.label}
            role="article"
            aria-label={`${kpi.label}: ${kpi.value}`}
            tabIndex={0}
          >
            {/* Header con icono y color de fondo */}
            <div className={styles.statsCardHeader}>
              <div 
                className={styles.statsIconContainer}
                style={{ 
                  backgroundColor: `${kpi.color}15`,
                  borderColor: `${kpi.color}30`
                }}
              >
                <Icon size={24} />
              </div>
            </div>

            {/* Contenido principal */}
            <div className={styles.statsCardContent}>
              <div className={styles.statsValue} aria-live="polite">
                {kpi.value.toLocaleString()}
              </div>
              <div className={styles.statsLabel}>
                {kpi.label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TenantStatsCards 
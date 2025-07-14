import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"

interface KPI {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number }>
  color: string
}

interface StatsCardsProps {
  kpis: KPI[]
}

const StatsCards: React.FC<StatsCardsProps> = ({ kpis }) => {
  const { t } = useTranslation()
  
  return (
    <div className={styles.statsCardsRow} role="region" aria-label={t('home.mainMetrics')}>
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
                {t(kpi.label)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards 
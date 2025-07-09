import React from "react"
import styles from "../styles/home.module.css"

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
  return (
    <div className={styles.statsCardsRow}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div className={styles.statsCard} key={kpi.label} style={{ borderBottom: `4px solid ${kpi.color}` }}>
            <div className={styles.statsIcon} style={{ color: kpi.color }}>
              <Icon size={28} />
            </div>
            <div className={styles.statsValue} style={{ color: 'var(--color-text)' }}>{kpi.value}</div>
            <div className={styles.statsLabel} style={{ color: 'var(--color-text)' }}>{kpi.label}</div>
          </div>
        )
      })}
    </div>
  )
}

export default StatsCards 
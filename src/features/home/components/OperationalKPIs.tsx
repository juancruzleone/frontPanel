import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { KPIItem } from "../types/homeTypes"

interface OperationalKPIsProps {
  kpis: KPIItem[]
}

const OperationalKPIs: React.FC<OperationalKPIsProps> = ({ kpis }) => {
  const { t } = useTranslation()

  return (
    <div className={styles.statsCardsRow} role="region" aria-label={t('home.operationalMetrics', { defaultValue: 'Métricas Operativas' })}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            className={styles.statsCard}
            key={kpi.label}
            role="article"
            aria-label={`${t(kpi.label, { defaultValue: kpi.label })}: ${kpi.value}${kpi.suffix || ''}`}
            tabIndex={0}
          >
            <div className={styles.statsCardHeader}>
              <div
                className={styles.statsIconContainer}
                style={{
                  backgroundColor: `${kpi.color}15`,
                  color: kpi.color
                }}
              >
                <Icon size={20} />
              </div>
            </div>

            <div className={styles.statsCardContent}>
              <div className={styles.statsValue} aria-live="polite">
                {kpi.value}
                {kpi.suffix && <span className={styles.statsSuffix}>{kpi.suffix}</span>}
              </div>
              <div className={styles.statsLabel}>
                {t(kpi.label, { defaultValue: kpi.label })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OperationalKPIs

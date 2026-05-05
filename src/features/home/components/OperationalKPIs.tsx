import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { KPIItem } from "../types/homeTypes"
import { TrendingUp, TrendingDown } from "lucide-react"

interface OperationalKPIsProps {
  kpis: KPIItem[]
}

const OperationalKPIs: React.FC<OperationalKPIsProps> = ({ kpis }) => {
  const { t } = useTranslation()

  return (
    <div className={styles.statsCardsRow} role="region" aria-label={t('home.operationalMetrics', { defaultValue: 'Métricas Operativas' })}>
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        const description = t(`home.kpiDescriptions.${kpi.id}`, {
          defaultValue: t('home.kpiDescriptions.generic', { defaultValue: '' })
        })

        const trend = kpi.trend

        return (
          <div
            className={styles.statsCard}
            key={kpi.id}
            aria-label={`${t(kpi.label, { defaultValue: kpi.label })}: ${kpi.value}${kpi.suffix || ''}. ${description}`}
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

              {trend && (
                <div className={`${styles.trendIndicator} ${trend.isPositive ? styles.trendUp : styles.trendDown}`}>
                  {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{trend.value}%</span>
                </div>
              )}
            </div>

            <div className={styles.statsCardContent}>
              <div className={styles.statsValue} aria-live="polite">
                {kpi.value}
                {kpi.suffix && <span className={styles.statsSuffix}>{kpi.suffix}</span>}
              </div>
              <div className={styles.statsLabel}>
                {t(kpi.label, { defaultValue: kpi.label })}
              </div>
              {description && (
                <p className={styles.statsDescription}>
                  {description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default OperationalKPIs

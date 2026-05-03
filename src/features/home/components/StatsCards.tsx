import React, { useState } from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { KPIItem } from "../types/homeTypes"
import { Info } from "lucide-react"
import { KPIDetailModal } from "./KPIDetailModal"

interface StatsCardsProps {
  kpis: KPIItem[]
}

const StatsCards: React.FC<StatsCardsProps> = ({ kpis }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedKpi, setSelectedKpi] = useState<KPIItem | null>(null)

  return (
    <>
      <div className={styles.statsCardsRow} role="region" aria-label={t('home.mainMetrics')}>
        {kpis.slice(0, 4).map((kpi) => {
          const Icon = kpi.icon
          const description = t(`home.kpiDescriptions.${kpi.id}`, {
            defaultValue: t('home.kpiDescriptions.generic', { defaultValue: '' })
          })

          return (
            <div
              className={styles.statsCard}
              key={kpi.id}
              role="button"
              aria-label={`${t(kpi.label, { defaultValue: kpi.label })}: ${kpi.value}. ${description}`}
              tabIndex={0}
              onClick={() => kpi.path && navigate(kpi.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (kpi.path) navigate(kpi.path)
                }
              }}
              style={{ cursor: kpi.path ? 'pointer' : 'default' }}
            >
              <button 
                className={styles.detailButton}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedKpi(kpi)
                }}
                aria-label={t('common.details')}
              >
                <Info size={16} />
              </button>

              {/* Header con icono y color de fondo */}
              <div className={styles.statsCardHeader}>
                <div
                  className={styles.statsIconContainer}
                  style={{
                    backgroundColor: `${kpi.color}15`,
                    color: kpi.color
                  }}
                >
                  <Icon size={24} />
                </div>
              </div>

              {/* Contenido principal */}
              <div className={styles.statsCardContent}>
                <div className={styles.statsValue} aria-live="polite">
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                </div>
                <div className={styles.statsLabel}>
                  {t(kpi.label)}
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

      <KPIDetailModal kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
    </>
  )
}

export default StatsCards

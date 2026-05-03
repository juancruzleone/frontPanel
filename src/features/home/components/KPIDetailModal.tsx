import React from "react"
import styles from "../styles/home.module.css"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { KPIItem } from "../types/homeTypes"

interface KPIDetailModalProps {
  kpi: KPIItem | null
  onClose: () => void
}

export const KPIDetailModal: React.FC<KPIDetailModalProps> = ({ kpi, onClose }) => {
  const { t } = useTranslation()

  if (!kpi) return null

  const Icon = kpi.icon

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label={t('common.close')}>
          <X size={24} />
        </button>
        
        <div className={styles.modalHeader}>
          <div 
            className={styles.modalIcon}
            style={{
              backgroundColor: `${kpi.color}15`,
              color: kpi.color
            }}
          >
            <Icon size={24} />
          </div>
          <h2 className={styles.modalTitle}>{t(kpi.label)}</h2>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.modalValue}>
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
            {kpi.suffix && <span className={styles.statsSuffix}>{kpi.suffix}</span>}
          </div>
          
          <div className={styles.modalDescription}>
            {t(`home.kpiDetails.${kpi.id}`, { 
              defaultValue: t('home.kpiDetails.generic', { defaultValue: 'Información detallada sobre esta métrica.' }) 
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

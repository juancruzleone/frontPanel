import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { TopIncidentInstallation, UpcomingPreventive } from "../types/homeTypes"
import { AlertCircle, Calendar } from "lucide-react"

interface OperationalListsProps {
  topIncidents: TopIncidentInstallation[]
  upcomingPreventive: UpcomingPreventive[]
}

const OperationalLists: React.FC<OperationalListsProps> = ({ topIncidents, upcomingPreventive }) => {
  const { t } = useTranslation()

  return (
    <div className={styles.operationalListsRow}>
      {/* Top Incident Installations */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <AlertCircle size={20} className={styles.listIcon} color="#e53935" />
          <h3 className={styles.listTitle}>{t('home.topIncidentInstallations', { defaultValue: 'Instalaciones con más Incidentes' })}</h3>
        </div>
        <div className={styles.listContent}>
          {topIncidents.length > 0 ? (
            topIncidents.map((item) => (
              <div key={item._id} className={styles.listItem}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemValue}>{item.count} {t('common.orders', { defaultValue: 'órdenes' })}</span>
              </div>
            ))
          ) : (
            <p className={styles.chartPlaceholder}>{t('common.noDataAvailable')}</p>
          )}
        </div>
      </div>

      {/* Upcoming Preventive Maintenance */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <Calendar size={20} className={styles.listIcon} color="var(--color-primary)" />
          <h3 className={styles.listTitle}>{t('home.upcomingPreventive', { defaultValue: 'Próximos Preventivos' })}</h3>
        </div>
        <div className={styles.listContent}>
          {upcomingPreventive.length > 0 ? (
            upcomingPreventive.map((item) => (
              <div key={item._id} className={styles.listItem}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className={styles.itemName}>{item.installationName}</span>
                  <span className={styles.itemDate}>{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <span className={styles.itemValue} style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.planName}</span>
              </div>
            ))
          ) : (
            <p className={styles.chartPlaceholder}>{t('common.noDataAvailable')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default OperationalLists

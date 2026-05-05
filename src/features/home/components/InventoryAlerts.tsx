import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { Package, Bell, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { DashboardAlert, InventoryStat } from "../types/homeTypes"

interface InventoryAlertsProps {
  inventoryStats?: InventoryStat[]
  alerts?: DashboardAlert[]
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({ inventoryStats = [], alerts = [] }) => {
  const { t } = useTranslation()

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} className={styles.alertWarningIcon} />
      case 'error': return <AlertCircle size={18} className={styles.alertErrorIcon} />
      case 'info': return <Info size={18} className={styles.alertInfoIcon} />
      default: return <Bell size={18} />
    }
  }

  const getAlertClass = (type: string) => {
    switch (type) {
      case 'warning': return styles.alertWarning
      case 'error': return styles.alertError
      case 'info': return styles.alertInfo
      default: return ''
    }
  }

  return (
    <aside className={styles.inventoryAlertsSidebar}>
      <div className={styles.sidebarCard}>
        <h3 className={styles.sidebarCardTitle}>
          <Package size={20} />
          {t('home.inventoryStatus')}
        </h3>
        <div className={styles.inventoryGrid}>
          {inventoryStats.length > 0 ? (
            inventoryStats.map((stat, idx) => (
              <div key={idx} className={styles.inventoryItem}>
                <span className={styles.inventoryLabel}>{t(stat.label, { defaultValue: stat.label })}</span>
                <span className={styles.inventoryValue}>{stat.value}</span>
              </div>
            ))
          ) : (
            <p className={styles.noAlerts}>{t('common.noDataAvailable')}</p>
          )}
        </div>
      </div>

      <div className={styles.sidebarCard}>
        <h3 className={styles.sidebarCardTitle}>
          <Bell size={20} />
          {t('home.alerts')}
        </h3>
        <div className={styles.alertsList}>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className={`${styles.alertItem} ${getAlertClass(alert.type)}`}>
                <div className={styles.alertIconWrapper}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className={styles.alertContent}>
                  <p className={styles.alertMessage}>{alert.message}</p>
                  {alert.detail && <span className={styles.alertDetail}>{alert.detail}</span>}
                  {alert.date && <span className={styles.alertDate}>{new Date(alert.date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noAlerts}>{t('home.noAlerts')}</p>
          )}
        </div>
      </div>
    </aside>
  )
}

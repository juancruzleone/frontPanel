import React from "react"
import styles from "../styles/home.module.css"
import { useTranslation } from "react-i18next"
import { Building2, Calendar } from "lucide-react"

interface WorkOrder {
  _id: string
  titulo: string
  estado: string
  instalacion?: { company: string }
  fechaCreacion?: string
}

interface RecentWorkOrdersProps {
  workOrders: WorkOrder[]
}

const estadoColor: Record<string, string> = {
  pendiente: "#fbc02d",
  asignada: "#1976d2",
  en_progreso: "#ff9800", // Cambiado para coincidir con el gráfico de torta
  completada: "#4caf50",
  cancelada: "#f44336",
}

const RecentWorkOrders: React.FC<RecentWorkOrdersProps> = ({ workOrders }) => {
  const { t } = useTranslation()
  
  const estadoLabels: Record<string, string> = {
    pendiente: t('workOrders.pending'),
    asignada: t('workOrders.assigned'),
    en_progreso: t('workOrders.inProgress'),
    completada: t('workOrders.completed'),
    cancelada: t('workOrders.cancelled'),
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Limitar a las 3 órdenes más recientes
  const recentOrders = workOrders.slice(0, 3)

  return (
    <div className={styles.chartCard} role="region" aria-label={t('home.recentOrders')}>
      <div className={styles.chartStats}>
        <span className={styles.chartTotal}>{recentOrders.length} {t('workOrders.title')}</span>
      </div>
      
      <div className={styles.ordersList}>
        {recentOrders.length === 0 ? (
          <div className={styles.noOrders} role="status">
            <div className={styles.noOrdersIcon}>📋</div>
            <p>{t('home.noRecentOrders')}</p>
            <small>{t('home.ordersWillAppear')}</small>
          </div>
        ) : (
          recentOrders.map((order, index) => (
            <div 
              className={styles.orderItem} 
              key={order._id}
              role="article"
              aria-label={`${t('workOrders.title')}: ${order.titulo}, ${t('workOrders.status')}: ${estadoLabels[order.estado] || order.estado}`}
            >
              <div className={styles.orderHeader}>
                <div className={styles.orderTitle}>{order.titulo}</div>
                <span
                  className={styles.orderStatus}
                  style={{ 
                    background: estadoColor[order.estado] || "#bdbdbd",
                    color: '#000'
                  }}
                >
                  {estadoLabels[order.estado] || order.estado}
                </span>
              </div>
              
              <div className={styles.orderMeta}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderInst}>
                    <Building2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {order.instalacion?.company || t('workOrders.noInstallation')}
                  </span>
                  <span className={styles.orderDate}>
                    <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {formatDate(order.fechaCreacion || "")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentWorkOrders 
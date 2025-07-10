import React from "react"
import styles from "../styles/home.module.css"

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

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_progreso: "En progreso",
  completada: "Completada",
  cancelada: "Cancelada",
}

const RecentWorkOrders: React.FC<RecentWorkOrdersProps> = ({ workOrders }) => {
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
    <div className={styles.chartCard} role="region" aria-label="Órdenes de trabajo recientes">
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Órdenes Recientes</h3>
        <div className={styles.chartStats}>
          <span className={styles.chartTotal}>{recentOrders.length} órdenes</span>
        </div>
      </div>
      
      <div className={styles.ordersList}>
        {recentOrders.length === 0 ? (
          <div className={styles.noOrders} role="status">
            <div className={styles.noOrdersIcon}>📋</div>
            <p>No hay órdenes recientes</p>
            <small>Las órdenes aparecerán aquí cuando se creen</small>
          </div>
        ) : (
          recentOrders.map((order, index) => (
            <div 
              className={styles.orderItem} 
              key={order._id}
              role="article"
              aria-label={`Orden: ${order.titulo}, Estado: ${estadoLabels[order.estado] || order.estado}`}
            >
              <div className={styles.orderHeader}>
                <div className={styles.orderTitle}>{order.titulo}</div>
                <span
                  className={styles.orderStatus}
                  style={{ 
                    background: estadoColor[order.estado] || "#bdbdbd",
                    color: order.estado === 'pendiente' ? '#000' : '#fff'
                  }}
                >
                  {estadoLabels[order.estado] || order.estado}
                </span>
              </div>
              
              <div className={styles.orderMeta}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderInst}>
                    🏢 {order.instalacion?.company || "Sin instalación"}
                  </span>
                  <span className={styles.orderDate}>
                    📅 {formatDate(order.fechaCreacion || "")}
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
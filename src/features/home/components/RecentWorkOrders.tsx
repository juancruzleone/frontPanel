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
  en_progreso: "#1976d2",
  completada: "#388e3c",
  cancelada: "#e53935",
}

const RecentWorkOrders: React.FC<RecentWorkOrdersProps> = ({ workOrders }) => {
  return (
    <div className={styles.recentOrdersCard}>
      <h3>Órdenes de trabajo recientes</h3>
      <div className={styles.ordersList}>
        {workOrders.length === 0 ? (
          <div className={styles.noOrders}>No hay órdenes recientes.</div>
        ) : (
          workOrders.map((order) => (
            <div className={styles.orderItem} key={order._id}>
              <div className={styles.orderTitle}>{order.titulo}</div>
              <div className={styles.orderMeta}>
                <span className={styles.orderInst}>{order.instalacion?.company || "-"}</span>
                <span className={styles.orderDate}>{order.fechaCreacion?.slice(0, 10) || ""}</span>
                <span
                  className={styles.orderStatus}
                  style={{ background: estadoColor[order.estado] || "#bdbdbd" }}
                >
                  {order.estado}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentWorkOrders 
import { useTranslation } from "react-i18next"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import type { RecentWorkOrderDto } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface RecentWorkOrdersProps {
  workOrders: RecentWorkOrderDto[]
}

const normalizeStatus = (status: string): string => {
  const normalized = status.toLocaleLowerCase().replace(/ /g, "_")
  const aliases: Record<string, string> = {
    pendiente: "pending",
    asignada: "assigned",
    en_progreso: "inProgress",
    completada: "completed",
    cancelada: "cancelled",
  }
  return aliases[normalized] || normalized
}

export const RecentWorkOrders = ({ workOrders }: RecentWorkOrdersProps) => {
  const { t, i18n } = useTranslation()

  if (workOrders.length === 0) {
    return <p className={styles.emptyState}>{t("home.noRecentOrders")}</p>
  }

  return (
    <ul className={styles.ordersList}>
      {workOrders.map((order) => {
        const status = normalizeStatus(order.estado)
        const date = order.fechaCreacion ? formatDateSafely(
          order.fechaCreacion,
          i18n.resolvedLanguage || "es",
          { dateStyle: "medium" },
          t("home.dashboard.dateUnavailable"),
        ) : null
        return (
          <li key={order._id} className={styles.orderItem}>
            <div><strong>{order.titulo}</strong><span>{order.instalacion?.company || t("workOrders.noInstallation")}</span></div>
            <div className={styles.orderMeta}>
              <span className={`${styles.orderStatus} ${styles[`status${status}`] || styles.statusOther}`}>{t(`home.status.${status}`, { defaultValue: order.estado })}</span>
              {date && <time dateTime={order.fechaCreacion}>{date}</time>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

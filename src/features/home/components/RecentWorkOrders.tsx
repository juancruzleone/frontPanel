import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import type { RecentWorkOrderDto } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface RecentWorkOrdersProps {
  workOrders: RecentWorkOrderDto[]
  /** Opens the shared work order detail dialog. `trigger` is the control that
   * asked for it, so the dialog can return focus when it closes. */
  onOpenDetail: (order: RecentWorkOrderDto, trigger: HTMLElement) => void
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

export const RecentWorkOrders = ({ workOrders, onOpenDetail }: RecentWorkOrdersProps) => {
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
        const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
          onOpenDetail(order, event.currentTarget)
        }
        return (
          <li key={order._id} className={styles.orderItem}>
            <button
              type="button"
              className={styles.orderRow}
              onClick={handleOpen}
              aria-label={t("home.dashboard.recent.openDetail", { title: order.titulo })}
            >
              <strong>{order.titulo}</strong><span>{order.instalacion?.company || t("workOrders.noInstallation")}</span>
            </button>
            <div className={styles.orderMeta}>
              <span className={`${styles.orderStatus} ${styles[`status${status}`] || styles.statusOther}`}>{t(`home.status.${status}`, { defaultValue: order.estado })}</span>
              {date && <time dateTime={order.fechaCreacion}>{date}</time>}
              <button type="button" className={styles.orderDetailButton} onClick={handleOpen}>
                {t("home.dashboard.recent.detail")}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

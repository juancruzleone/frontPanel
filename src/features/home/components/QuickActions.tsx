import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { Plus, Package, Building2, Calendar } from "lucide-react"
import { useAuthStore } from "../../../store/authStore"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import styles from "../styles/home.module.css"

interface QuickActionsProps {
  onCreateWorkOrder: () => void
  onRegisterAsset: () => void
  onAddInstallation: () => void
}

export const QuickActions = ({
  onCreateWorkOrder,
  onRegisterAsset,
  onAddInstallation,
}: QuickActionsProps) => {
  const { t } = useTranslation()
  const { getRoute } = useTranslatedRoutes()
  const role = useAuthStore((state) => state.role)
  const isClient = role === "cliente"

  return (
    <div className={styles.quickActionsSection}>
      <h2 id="quick-actions-title" className={styles.sectionHeading}>
        {t("home.dashboard.quickActions.title", { defaultValue: "Acciones rápidas" })}
      </h2>
      <div className={`${styles.quickActionsGrid} ${isClient ? styles.clientQuickActionsGrid : ""}`}>
        <button
          type="button"
          onClick={onCreateWorkOrder}
          className={`${styles.quickActionCard} ${styles.quickActionPrimary}`}
        >
          <Plus size={18} className={styles.quickActionIconPrimary} aria-hidden />
          <span className={styles.quickActionTextPrimary}>
            {t("home.dashboard.quickActions.createWorkOrder", { defaultValue: "Crear orden de trabajo" })}
          </span>
        </button>
        {!isClient && (
          <button
            type="button"
            onClick={onRegisterAsset}
            className={styles.quickActionCard}
          >
            <Package size={18} className={styles.quickActionIcon} aria-hidden />
            <span>{t("home.dashboard.quickActions.registerAsset", { defaultValue: "Registrar activo" })}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onAddInstallation}
          className={styles.quickActionCard}
        >
          <Building2 size={18} className={styles.quickActionIcon} aria-hidden />
          <span>{t("home.dashboard.quickActions.addInstallation", { defaultValue: "Agregar instalación" })}</span>
        </button>
        <Link to={getRoute("calendar")} className={styles.quickActionCard}>
          <Calendar size={18} className={styles.quickActionIcon} aria-hidden />
          <span>{t("home.dashboard.quickActions.maintenanceCalendar", { defaultValue: "Calendario de mantenimiento" })}</span>
        </Link>
      </div>
    </div>
  )
}

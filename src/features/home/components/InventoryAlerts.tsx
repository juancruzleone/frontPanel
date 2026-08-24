import { useTranslation } from "react-i18next"
import type { InventorySummaryData } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface InventorySummaryProps {
  data: InventorySummaryData | null
  hasError: boolean
}

export const InventorySummary = ({ data, hasError }: InventorySummaryProps) => {
  const { t } = useTranslation()
  return (
    <section className={styles.inventorySummary} aria-labelledby="inventory-summary-title">
      <div><p className={styles.panelKicker}>{t("home.dashboard.inventory.kicker")}</p><h2 id="inventory-summary-title">{t("home.dashboard.inventory.title")}</h2></div>
      {hasError ? <p className={styles.partialError}>{t("home.dashboard.errors.inventory")}</p> : data ? (
        <dl>
          <div><dt>{t("home.dashboard.inventory.items")}</dt><dd>{data.totalItems}</dd></div>
          <div className={data.lowStockItems > 0 ? styles.warning : ""}><dt>{t("home.dashboard.inventory.lowStock")}</dt><dd>{data.lowStockItems}</dd></div>
        </dl>
      ) : <p className={styles.emptyState}>{t("common.noDataAvailable")}</p>}
    </section>
  )
}

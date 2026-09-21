import { useTranslation } from "react-i18next"
import type { InventorySummaryData } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface InventorySummaryProps {
  data: InventorySummaryData | null
  hasError: boolean
}

export const InventorySummary = ({ data, hasError }: InventorySummaryProps) => {
  const { t } = useTranslation()
  const items = data?.items ?? []
  const lowDetails = data?.lowStockDetails ?? data?.lowStockItemsDetail ?? []
  const totalItems = data?.totalItems ?? 0
  const lowCount = data?.lowStockItems ?? 0
  const hasItems = items.length > 0 || totalItems > 0

  return (
    <section className={styles.inventorySummary} aria-labelledby="inventory-summary-title">
      <div>
        <p className={styles.panelKicker}>{t("home.dashboard.inventory.kicker")}</p>
        <h2 id="inventory-summary-title">{t("home.dashboard.inventory.title")}</h2>
        {data && hasItems && (
          <p className={styles.inventoryMeta}>
            {t("home.dashboard.inventory.meta", { total: totalItems, low: lowCount })}
          </p>
        )}
      </div>
      {hasError ? (
        <p className={styles.partialError}>{t("home.dashboard.errors.inventory")}</p>
      ) : !data || !hasItems ? (
        <p className={styles.emptyState}>{t("home.dashboard.inventory.empty")}</p>
      ) : (
        <ul className={styles.inventoryList} aria-label={t("home.dashboard.inventory.title")}>
          {items.slice(0, 5).map((item) => {
            const isLow = item.currentStock <= item.minimumStock
            const lowBadge = isLow ? lowDetails.some((d) => d._id === item._id) || isLow : false
            return (
              <li
                key={item._id}
                className={isLow ? `${styles.inventoryItem} ${styles.inventoryItemLow}` : styles.inventoryItem}
              >
                <span className={styles.inventoryItemName} title={item.name}>
                  {item.name}
                </span>
                <span className={styles.inventoryItemStock}>
                  {item.currentStock} {item.unit}
                  <span className={styles.inventoryItemMin}> (mín {item.minimumStock})</span>
                  {lowBadge && (
                    <span className={styles.inventoryBadge}>{t("home.dashboard.inventory.lowBadge")}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

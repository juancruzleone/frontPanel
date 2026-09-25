import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { useTranslatedRoutes } from "../../../router/useTranslatedRoutes"
import type { InventorySummaryData } from "../types/homeTypes"
import styles from "../styles/home.module.css"

interface InventorySummaryProps {
  data: InventorySummaryData | null
  hasError: boolean
  onRetry?: () => void
  retrying?: boolean
}

/** The summary endpoint caps item details at five rows; the totals come from
 * the paginated count, so the card can state how many items stay in the
 * registry instead of silently dropping them. */
const MAX_VISIBLE_ITEMS = 5

export const InventorySummary = ({ data, hasError, onRetry, retrying = false }: InventorySummaryProps) => {
  const { t } = useTranslation()
  const { getRoute } = useTranslatedRoutes()
  const items = data?.items ?? []
  const lowDetails = data?.lowStockDetails ?? data?.lowStockItemsDetail ?? []
  const totalItems = Math.max(data?.totalItems ?? 0, items.length)
  const lowCount = Math.min(data?.lowStockItems ?? 0, totalItems)
  const okCount = Math.max(totalItems - lowCount, 0)
  const hasItems = items.length > 0 || (data?.totalItems ?? 0) > 0
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenItems = Math.max(totalItems - visibleItems.length, 0)

  return (
    <section className={styles.inventorySummary} aria-labelledby="inventory-summary-title">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelKicker}>{t("home.dashboard.inventory.kicker")}</p>
          <h2 id="inventory-summary-title">{t("home.dashboard.inventory.title")}</h2>
          {data && hasItems && (
            <p className={styles.inventoryMeta}>
              {t("home.dashboard.inventory.meta", { total: totalItems, low: lowCount })}
            </p>
          )}
        </div>
        <Link className={styles.panelAction} to={getRoute("inventory")}>
          {t("home.dashboard.inventory.viewAll")}
        </Link>
      </div>
      {hasError ? (
        <div role="alert">
          <p className={styles.partialError}>{t("home.dashboard.errors.inventory")}</p>
          {onRetry && <button className={styles.panelAction} type="button" onClick={onRetry} disabled={retrying}>{t("common.retry")}</button>}
        </div>
      ) : !data || !hasItems ? (
        <p className={styles.emptyState}>{t("home.dashboard.inventory.empty")}</p>
      ) : (
        <>
          {visibleItems.length > 0 ? (
            <ul className={styles.inventoryList} aria-label={t("home.dashboard.inventory.title")}>
              {visibleItems.map((item) => {
                const isLow = item.currentStock <= item.minimumStock
                const lowBadge = isLow ? lowDetails.some((d) => d._id === item._id) || isLow : false
                return (
                  <li key={item._id}>
                    <Link
                      to={getRoute("inventory")}
                      className={isLow ? `${styles.inventoryItem} ${styles.inventoryItemLow}` : styles.inventoryItem}
                    >
                    <span className={styles.inventoryItemName} title={item.name}>
                      {item.name}
                    </span>
                    <span className={styles.inventoryItemStock}>
                      {item.currentStock} {item.unit}
                      <span className={styles.inventoryItemMin}> ({t("home.dashboard.inventory.minimum", { count: item.minimumStock })})</span>
                      {lowBadge && (
                        <span className={styles.inventoryBadge}>{t("home.dashboard.inventory.lowBadge")}</span>
                      )}
                    </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.inventoryMeta}>{t("home.dashboard.inventory.noDetails")}</p>
          )}
          {hiddenItems > 0 && (
            <p className={styles.inventoryMeta}>
              {t("home.dashboard.inventory.more", { count: hiddenItems })}
            </p>
          )}
          {/* Stock state in numbers: real totals, no invented rows. The block
           * absorbs the leftover height of the card. */}
          <dl>
            <div>
              <dt>{t("home.dashboard.inventory.items")}</dt>
              <dd>{totalItems}</dd>
            </div>
            <div>
              <dt>{t("home.dashboard.inventory.lowStock")}</dt>
              <dd>{lowCount}</dd>
            </div>
            <div>
              <dt>{t("home.dashboard.inventory.okStock")}</dt>
              <dd>{okCount}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}

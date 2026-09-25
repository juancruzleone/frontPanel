import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { formatDateSafely } from "../../../shared/utils/formatDateSafely"
import type { DashboardMetadataDto, DashboardRole, RangeOption } from "../types/homeTypes"
import { RangeFilter } from "./RangeFilter"
import styles from "../styles/home.module.css"

interface DashboardHeaderProps {
  role: DashboardRole
  metadata: DashboardMetadataDto
  range: RangeOption
  onRangeChange: (range: RangeOption) => void
  secondaryAction?: ReactNode
  loading?: boolean
}

export const DashboardHeader = ({ role, metadata, range, onRangeChange, secondaryAction, loading = false }: DashboardHeaderProps) => {
  const { t, i18n } = useTranslation()
  const updatedAt = formatDateSafely(
    metadata.lastUpdate,
    i18n.resolvedLanguage || "es",
    { dateStyle: "medium", timeStyle: "short" },
    t("home.dashboard.dateUnavailable"),
  )

  return (
    <header className={styles.dashboardHeader}>
      <div className={styles.headerCopy}>
        <p className={styles.headerKicker}>
          <span className={styles.headerKickerDot} aria-hidden="true" />
          <span>{t("home.dashboard.scopeLabel")}: {t(`home.dashboard.scope.${metadata.scope}`)}</span>
        </p>
        <h1>{t(`home.dashboard.roles.${role}.title`)}</h1>
        <p className={styles.subtitle}>{t(`home.dashboard.roles.${role}.description`)}</p>
        <dl className={styles.headerMetadata}>
          <div><dt>{t("home.dashboard.updated")}</dt><dd>{loading ? <span className={`${styles.skeleton} ${styles.skeletonUpdated}`} aria-hidden="true">&nbsp;</span> : updatedAt}</dd></div>
        </dl>
      </div>
      <div className={styles.headerActions}>
        <RangeFilter current={range} onChange={onRangeChange} />
        {secondaryAction}
      </div>
    </header>
  )
}

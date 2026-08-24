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
}

export const DashboardHeader = ({ role, metadata, range, onRangeChange, secondaryAction }: DashboardHeaderProps) => {
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
        <p className={styles.eyebrow}>{t(`home.dashboard.scope.${metadata.scope}`)}</p>
        <h1>{t(`home.dashboard.roles.${role}.title`)}</h1>
        <p className={styles.subtitle}>{t(`home.dashboard.roles.${role}.description`)}</p>
        <dl className={styles.headerMetadata}>
          <div><dt>{t("home.dashboard.updated")}</dt><dd>{updatedAt}</dd></div>
          <div><dt>{t("home.dashboard.scopeLabel")}</dt><dd>{t(`home.dashboard.scope.${metadata.scope}`)}</dd></div>
        </dl>
      </div>
      <div className={styles.headerActions}>
        <RangeFilter current={range} onChange={onRangeChange} />
        {secondaryAction}
      </div>
    </header>
  )
}

import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import type { TrialSummary } from "@/store/authStore"
import { formatTrialDate, getTrialDateState, getTrialDaysRemaining } from "../utils/trialDates"
import styles from "../styles/billing.module.css"

export interface TrialStatusCardProps {
  trial: TrialSummary
  now?: Date
}

export const TrialStatusCard = ({ trial, now }: TrialStatusCardProps) => {
  const { t, i18n } = useTranslation()
  const daysRemaining = getTrialDaysRemaining(trial.endsAt, now)
  const dateState = getTrialDateState(trial.endsAt, now)
  const statusText = dateState === "active"
    ? t("billing.trialCard.remaining", { count: daysRemaining, date: formatTrialDate(trial.endsAt, i18n.language) })
    : t(`billing.trialCard.${dateState}`)

  return (
    <aside className={styles.trialCard} aria-label={t("billing.trialCard.label")}>
      <div>
        <strong>{t("billing.trialCard.title", { plan: t(`billing.plans.${trial.plan}`) })}</strong>
        <p>{statusText}</p>
      </div>
      <Link className={styles.secondaryLink} to="/billing">{t("billing.trialCard.cta")}</Link>
    </aside>
  )
}

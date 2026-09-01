import { useState } from "react"
import { useTranslation } from "react-i18next"
import { createCheckout, navigateToCheckout, saveCheckoutIntentId } from "../services/billingService"
import { useBillingStatus } from "../hooks/useBillingStatus"
import type { BillingCycle } from "../types/billing.types"
import { formatTrialDate } from "../utils/trialDates"
import styles from "../styles/billing.module.css"

export const BillingAccessPage = () => {
  const { t, i18n } = useTranslation()
  const { data, loading, error, retry } = useBillingStatus()
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("professional")
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const checkout = await createCheckout({ planId: selectedPlan, billingCycle })
      saveCheckoutIntentId(checkout.checkoutIntentId)
      navigateToCheckout(checkout.checkoutUrl)
    } catch (checkoutFailure) {
      setCheckoutError(checkoutFailure instanceof Error ? checkoutFailure.message : t("billing.errors.checkout"))
      setCheckoutLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-busy={loading || checkoutLoading}>
        {loading ? <p role="status" aria-live="polite">{t("billing.loading")}</p> : error || !data ? (
          <div role="alert">
            <p className={styles.error}>{error || t("billing.errors.status")}</p>
            <button className={styles.primaryButton} type="button" onClick={() => void retry()}>{t("common.retry")}</button>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <h1>{data.accessMode === "billing_only" ? t("billing.expired.title") : t("billing.manage.title")}</h1>
              <p>{data.accessMode === "billing_only" ? t("billing.expired.message") : t("billing.manage.message")}</p>
            </header>

            <dl className={styles.summary}>
              <div><dt>{t("billing.company")}</dt><dd>{data.tenant.name}</dd></div>
              <div><dt>{t("billing.currentPlan")}</dt><dd>{t(`billing.plans.${data.trial?.plan || data.tenant.plan}`)}</dd></div>
              <div><dt>{t("billing.trialEnd")}</dt><dd>{data.trial ? formatTrialDate(data.trial.endsAt, i18n.language) : "—"}</dd></div>
            </dl>

            <fieldset className={styles.fieldset}>
              <legend>{t("billing.selectPlan")}</legend>
              <div className={styles.options}>
                {data.availablePlans.map((plan) => (
                  <label className={styles.option} key={plan.planId}>
                    <input type="radio" name="plan" value={plan.planId} checked={selectedPlan === plan.planId} onChange={() => setSelectedPlan(plan.planId)} />
                    <span><strong>{t(`billing.plans.${plan.planId}`)}</strong><br />{t("billing.price", { price: billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice })}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{t("billing.billingCycle")}</legend>
              <div className={styles.cycleOptions}>
                {(["monthly", "yearly"] as const).map((cycle) => (
                  <label className={styles.option} key={cycle}>
                    <input type="radio" name="billingCycle" value={cycle} checked={billingCycle === cycle} onChange={() => setBillingCycle(cycle)} />
                    <span>{t(`billing.cycles.${cycle}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {checkoutError && <p className={styles.error} role="alert" aria-live="assertive">{checkoutError}</p>}
            <button className={styles.primaryButton} type="button" disabled={checkoutLoading} onClick={() => void handleCheckout()}>
              {checkoutLoading ? t("billing.checkout.loading") : t("billing.checkout.cta")}
            </button>
          </>
        )}
      </section>
    </main>
  )
}

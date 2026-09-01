import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams } from "react-router"
import { useAuthStore, type LoginResponse } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { useTranslatedRoutes } from "@/router/useTranslatedRoutes"
import { readCheckoutIntentId } from "../services/billingService"
import { useCheckoutPolling } from "../hooks/useCheckoutPolling"
import styles from "../styles/billing.module.css"

const safeIntentId = (value: string | undefined): string | null => (
  value && /^[a-zA-Z0-9-]{8,128}$/.test(value) ? value : null
)

export const BillingReturnPage = () => {
  const { t } = useTranslation()
  const { checkoutIntentId: routeIntentId } = useParams()
  const checkoutIntentId = safeIntentId(routeIntentId) || readCheckoutIntentId()
  const hydrateSession = useAuthStore((state) => state.hydrateSession)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved)
  const accessMode = useAuthStore((state) => state.accessMode)
  const navigate = useNavigate()
  const { getRoute } = useTranslatedRoutes()

  const handlePromoted = useCallback((response: LoginResponse) => {
    hydrateSession(response)
    if (response.csrfToken) useCSRFStore.setState({ token: response.csrfToken, error: null })
    navigate(getRoute("home"), { replace: true })
  }, [getRoute, hydrateSession, navigate])

  const hasFullAccess = isAuthenticated && accessMode === "full"
  const { status, error, attempts, retry } = useCheckoutPolling({
    checkoutIntentId,
    enabled: isAuthResolved && !hasFullAccess && accessMode === "billing_only",
    onPromoted: handlePromoted,
  })

  if (hasFullAccess) return <Navigate to={getRoute("home")} replace />

  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.status}`} aria-live="polite">
        <h1>{t("billing.return.title")}</h1>
        {status === "invalid" ? <p role="alert" className={styles.error}>{t("billing.return.invalid")}</p> : (
          <>
            <p>{t(`billing.return.status.${status}`)}</p>
            {status === "pending" && <p>{t("billing.return.attempt", { count: attempts })}</p>}
            {error && (
              <div role="alert">
                <p className={styles.error}>{error.startsWith("billing.") ? t(error) : error}</p>
                <button className={styles.primaryButton} type="button" onClick={retry}>{t("billing.return.retry")}</button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}

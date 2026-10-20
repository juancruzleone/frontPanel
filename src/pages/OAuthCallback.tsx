import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router"
import { useAuthStore, type LoginResponse } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { verifySession } from "@/features/auth/services/loginServices"
import { routeTranslations, type Language } from "@/router/routeTranslations"
import {
  readOAuthCallbackQuery,
  resolveCallbackReturnTarget,
  resolveOAuthErrorMessageKey,
} from "@/features/auth/services/oauthServices"
import styles from "./notFound.module.css"

// backPanel has already finished the OAuth transaction by the time this page
// exists: it owns the Auth0 secret, the PKCE verifier, the state, the token
// exchange, and the session cookies. What is left for frontGMAO is to prove the
// cookie session actually works, hydrate CSRF and auth state from that proof,
// and only then leave the callback route. Every step fails closed: an
// unverified hand-off never authenticates, never stores anything, and never
// clears the durable logout marker.

const APP_ROOT = "/"

const LOGIN_ROUTE = "/"

/** The home route of the language the app is currently serving. */
const localizedHomeRoute = (language: unknown): string => {
  const code = typeof language === "string" ? language.split("-")[0] : ""
  const supported = (Object.keys(routeTranslations) as Language[]).find((candidate) => candidate === code)
  const home = supported ? routeTranslations[supported].home : ""

  return typeof home === "string" && home.length > 0 ? `/${home}` : APP_ROOT
}

/** A 200 from the session endpoint is only a session if it names an identity. */
const hasVerifiedIdentity = (session: LoginResponse): boolean => {
  const user = session.user || session.cuenta

  return Boolean(user && typeof user._id === "string" && user._id.length > 0)
}

const hydrateCsrfToken = async (token: unknown): Promise<void> => {
  if (typeof token === "string" && token.length > 0) {
    useCSRFStore.setState({ token, error: null })
    return
  }

  await useCSRFStore.getState().fetchToken()
  const hydratedToken = useCSRFStore.getState().token
  if (typeof hydratedToken !== "string" || hydratedToken.length === 0) {
    useCSRFStore.setState({ token: null })
    throw new Error("CSRF token unavailable")
  }
}

const OAuthCallback = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const hydrateSession = useAuthStore((state) => state.hydrateSession)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)
  const setAuthResolved = useAuthStore((state) => state.setAuthResolved)
  const [failureKey, setFailureKey] = useState<string | null>(null)
  const flowStarted = useRef(false)
  const handoff = location.search
  const homeRoute = localizedHomeRoute(i18n.language)

  useEffect(() => {
    // StrictMode mounts effects twice and the OAuth hand-off is a one-shot
    // browser transaction: claim it once per page instance so the session is
    // verified exactly once.
    if (flowStarted.current) return
    flowStarted.current = true

    const query = readOAuthCallbackQuery(handoff)

    const failClosed = (messageKey: string) => {
      setFailureKey(messageKey)
      // Resolves the guard state without authenticating anyone: the durable
      // logout marker and any prior session stay exactly as they were.
      setAuthenticated(false)
      setAuthResolved(true)
    }

    const completeHandoff = async () => {
      if (query.errorCode !== null) {
        failClosed(resolveOAuthErrorMessageKey(query.errorCode))
        return
      }

      try {
        const session = await verifySession()
        if (!hasVerifiedIdentity(session)) throw new Error("Sesión no verificada")

        await hydrateCsrfToken(session.csrfToken)

        // Only a session and a CSRF token that both checked out may clear the
        // durable logout marker, which is what hydration does.
        hydrateSession(session)
        navigate(resolveCallbackReturnTarget(query.returnTo, homeRoute), { replace: true })
      } catch {
        failClosed("auth.oauth.callback.sessionFailed")
      }
    }

    void completeHandoff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className={styles.containerNotFound}>
      <div className={styles.content}>
        <div className={styles.errorCard}>
          <h1 className={styles.errorSubtitle}>{t("auth.oauth.callback.title")}</h1>

          {failureKey ? (
            <div role="alert" aria-live="assertive" className={styles.errorDescription}>
              <p>{t(failureKey)}</p>
            </div>
          ) : (
            <div role="status" aria-live="polite" className={styles.errorDescription}>
              <p>{t("auth.oauth.callback.verifying")}</p>
            </div>
          )}

          {failureKey && (
            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => navigate(LOGIN_ROUTE, { replace: true })}
              >
                {t("auth.oauth.callback.retry")}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate(homeRoute, { replace: true })}
              >
                {t("auth.oauth.callback.home")}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default OAuthCallback

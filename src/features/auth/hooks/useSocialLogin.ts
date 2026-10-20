import { useCallback, useMemo, useState } from "react"
import { useLocation } from "react-router"
import { useTranslatedRoutes } from "@/router/useTranslatedRoutes"
import {
  OAUTH_PROVIDERS,
  isSafeAppReturnTarget,
  startOAuthLogin,
  type OAuthProvider,
} from "../services/oauthServices"

const APP_ROOT = "/"

/**
 * Where backPanel should send the browser after the session exists. A visitor
 * who reached the login page from a localized app route keeps that route; the
 * login root itself falls back to the localized home so the callback never
 * lands on a page the auth guards would bounce again.
 */
export const resolveOAuthReturnTarget = (pathname: unknown, homeRoute: unknown): string => {
  if (isSafeAppReturnTarget(pathname) && pathname !== APP_ROOT) return pathname
  if (isSafeAppReturnTarget(homeRoute)) return homeRoute
  return APP_ROOT
}

export const useSocialLogin = () => {
  const location = useLocation()
  const { getRoute } = useTranslatedRoutes()
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null)

  const returnTo = useMemo(
    () => resolveOAuthReturnTarget(location.pathname, getRoute("home")),
    [getRoute, location.pathname],
  )

  const startLogin = useCallback((provider: OAuthProvider) => {
    if (pendingProvider) return

    setErrorMessageKey(null)
    setPendingProvider(provider)

    // A refused start never navigates, so the controls must come back to life.
    if (!startOAuthLogin({ provider, returnTo })) {
      setPendingProvider(null)
      setErrorMessageKey("auth.oauth.unavailable")
    }
  }, [pendingProvider, returnTo])

  return {
    providers: OAUTH_PROVIDERS,
    pendingProvider,
    isRedirecting: pendingProvider !== null,
    errorMessageKey,
    returnTo,
    startLogin,
  }
}

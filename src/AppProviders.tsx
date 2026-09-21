import React from "react"
import { Toaster } from "sonner"
import { useTheme } from "./shared/hooks/useTheme"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { verifySession } from "./features/auth/services/loginServices"
import { OfflineSyncManager } from "./shared/components/OfflineSyncManager"
import { initializeOfflineTrust } from "./shared/offline/trustInit"
import { prepareRoleOfflinePackage } from './shared/offline/roleBootstrap'
import { clearCheckoutIntentId, getBillingStatus, promoteBillingSession } from "./features/billing/services/billingService"
import { isRetriableRequestError } from "./shared/services/ApiError"

let bootstrapPromise: ReturnType<typeof verifySession> | null = null

const verifyCurrentSession = () => {
  if (!bootstrapPromise) {
    bootstrapPromise = verifySession().finally(() => {
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

export const ThemedToaster = () => {
  const { dark } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={dark ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "appToast",
          title: "appToastTitle",
          description: "appToastDescription",
        },
      }}
    />
  )
}

// App initialization component
export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [isSessionBootstrapComplete, setIsSessionBootstrapComplete] = React.useState(false)
  const csrfHydratedFromSessionRef = React.useRef(false)
  const hydrateSession = useAuthStore((state) => state.hydrateSession)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved)
  const accessMode = useAuthStore((state) => state.accessMode)
  const setBillingContext = useAuthStore((state) => state.setBillingContext)
  const logout = useAuthStore((state) => state.logout)
  const fetchToken = useCSRFStore((state) => state.fetchToken)
  const csrfToken = useCSRFStore((state) => state.token)
  const csrfIsLoading = useCSRFStore((state) => state.isLoading)
  const csrfError = useCSRFStore((state) => state.error)

	React.useEffect(() => {
		let cancelled = false

    const bootstrapSession = async () => {
      const clearInvalidSession = async () => {
        try {
          await logout()
        } catch {
          // Logout still clears auth state before reporting an offline purge failure.
        }
      }

      csrfHydratedFromSessionRef.current = false
      // Durable logout guard: only an explicit login may clear this marker.
      try {
        const logoutEpoch = localStorage.getItem('logout-epoch');
        if (logoutEpoch) {
          useAuthStore.setState({ isAuthenticated: false, isAuthResolved: true, accessMode: "anonymous" });
          return;
        }
      } catch {}
      const currentState = useAuthStore.getState()
      useAuthStore.setState({ isAuthenticated: false, isAuthResolved: false })
      try {
        if (currentState.accessMode === "billing_only") {
          const billingStatus = await getBillingStatus()
          if (cancelled) return
          if (billingStatus.accessMode === "full") {
            const promotedSession = await promoteBillingSession()
            clearCheckoutIntentId()
            if (!cancelled) {
              hydrateSession(promotedSession)
              if (promotedSession.csrfToken) {
                csrfHydratedFromSessionRef.current = true
                useCSRFStore.setState({ token: promotedSession.csrfToken, error: null })
              }
            }
          } else if (billingStatus.accessMode === "billing_only") {
            setBillingContext(billingStatus)
          } else {
            await clearInvalidSession()
          }
          return
        }
        const response = await verifyCurrentSession()
        if (!cancelled) {
          if (response.csrfToken) {
            csrfHydratedFromSessionRef.current = true
            useCSRFStore.setState({ token: response.csrfToken, error: null })
          }
          hydrateSession(response)
          const user = response.user || response.cuenta
          if (user?.role === "admin") {
            try {
              const billingStatus = await getBillingStatus()
              if (!cancelled && billingStatus.accessMode !== "denied") setBillingContext(billingStatus)
            } catch {
              // A valid full session must remain usable if optional billing metadata is unavailable.
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (currentState.accessMode === "billing_only") {
            if (isRetriableRequestError(err)) {
              useAuthStore.setState({
                isAuthenticated: false,
                isAuthResolved: true,
                accessMode: "billing_only",
              })
            } else {
              await clearInvalidSession()
            }
            return
          }

          // Distinguish true network/offline from explicit 401/403 auth failures
          const isAuthError = err instanceof Error && (
            err.message.includes('401') ||
            err.message.includes('403') ||
            (err as any).code === 'MISSING_AUTH_HEADER' ||
            (err as any).code === 'TOKEN_EXPIRED' ||
            (err as any).status === 401 ||
            (err as any).status === 403
          );
          if (isAuthError) {
            useAuthStore.setState({ isAuthenticated: false, isAuthResolved: true, accessMode: "anonymous" });
            try { localStorage.removeItem('auth-storage'); } catch {}
            return;
          }
          const isNetworkError = !navigator.onLine || 
            (err instanceof Error && (
              err.message.toLowerCase().includes('network') || 
              err.message.toLowerCase().includes('fetch') ||
              err.message.toLowerCase().includes('failed to fetch') ||
              err.message.toLowerCase().includes('load failed')
            ));
          
           const latestState = useAuthStore.getState()
           // After explicit logout, never re-auth from stale latestState
           const wasExplicitLogout = (() => { try { return Boolean(localStorage.getItem('logout-epoch')); } catch { return false; } })();
           useAuthStore.setState({
             isAuthenticated: !wasExplicitLogout && isNetworkError && latestState.accessMode === "full" && Boolean(latestState.userId),
             isAuthResolved: true,
           })
        }
      }
    }

    void bootstrapSession().finally(() => {
      if (!cancelled) setIsSessionBootstrapComplete(true)
    })

    // Refresh on reconnection
    const handleOnline = () => {
      setIsSessionBootstrapComplete(false)
      void bootstrapSession().finally(() => {
        if (!cancelled) setIsSessionBootstrapComplete(true)
      })
    }
    window.addEventListener('online', handleOnline)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
    }
  }, [hydrateSession, logout, setBillingContext])
  
  React.useEffect(() => {
    // Fetch CSRF token when user is authenticated and no token exists
    if (isSessionBootstrapComplete && !csrfHydratedFromSessionRef.current && isAuthResolved && (isAuthenticated || accessMode === "billing_only") && !csrfToken && !csrfIsLoading && !csrfError) {
      void fetchToken().catch(() => undefined)
    }
  }, [accessMode, isAuthResolved, isAuthenticated, isSessionBootstrapComplete, csrfToken, csrfIsLoading, csrfError, fetchToken])

  // Initialize offline trust after authentication (online only)
  React.useEffect(() => {
    if (isAuthResolved && isAuthenticated && accessMode === "full" && navigator.onLine && Boolean(csrfToken) && !csrfIsLoading && !csrfError) {
      initializeOfflineTrust()
        .then(result => result.ok ? prepareRoleOfflinePackage() : undefined)
        .catch(() => {})
    }
  }, [accessMode, isAuthResolved, isAuthenticated, csrfError, csrfIsLoading, csrfToken])

  return (
    <>
      {isAuthResolved && isAuthenticated && accessMode === "full" && <OfflineSyncManager />}
      {children}
    </>
  )
}

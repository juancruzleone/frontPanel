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
                useCSRFStore.setState({ token: promotedSession.csrfToken, error: null })
              }
            }
          } else if (billingStatus.accessMode === "billing_only") {
            setBillingContext(billingStatus)
          } else {
            logout()
          }
          return
        }
        const response = await verifyCurrentSession()
        if (!cancelled) {
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
              logout()
            }
            return
          }

          // Si el error es de red (offline), mantenemos el estado actual del store
          // Si es un error explícito de sesión inválida (401), el store debería resetearse
          const isNetworkError = !navigator.onLine || 
            (err instanceof Error && (
              err.message.toLowerCase().includes('network') || 
              err.message.toLowerCase().includes('fetch') ||
              err.message.toLowerCase().includes('failed to fetch') ||
              err.message.toLowerCase().includes('load failed')
            ));
          
           const latestState = useAuthStore.getState()
           useAuthStore.setState({
             isAuthenticated: isNetworkError && latestState.accessMode === "full" && Boolean(latestState.userId),
             isAuthResolved: true,
           })
        }
      }
    }

    bootstrapSession()

    // Refresh on reconnection
    const handleOnline = () => {
      bootstrapSession()
    }
    window.addEventListener('online', handleOnline)

    return () => {
      cancelled = true
      window.removeEventListener('online', handleOnline)
    }
  }, [hydrateSession, logout, setBillingContext])
  
  React.useEffect(() => {
    // Fetch CSRF token when user is authenticated and no token exists
    if (isAuthResolved && (isAuthenticated || accessMode === "billing_only") && !csrfToken && !csrfIsLoading && !csrfError) {
      fetchToken()
    }
  }, [accessMode, isAuthResolved, isAuthenticated, csrfToken, csrfIsLoading, csrfError, fetchToken])

  // Initialize offline trust after authentication (online only)
  React.useEffect(() => {
    if (isAuthResolved && isAuthenticated && accessMode === "full" && navigator.onLine) {
      initializeOfflineTrust()
        .then(result => result.ok ? prepareRoleOfflinePackage() : undefined)
        .catch(() => {})
    }
  }, [accessMode, isAuthResolved, isAuthenticated])

  return (
    <>
      {isAuthResolved && isAuthenticated && accessMode === "full" && <OfflineSyncManager />}
      {children}
    </>
  )
}

import React from "react"
import { Toaster } from "sonner"
import { useTheme } from "./shared/hooks/useTheme"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { verifySession } from "./features/auth/services/loginServices"
import { OfflineSyncManager } from "./shared/components/OfflineSyncManager"

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
  const fetchToken = useCSRFStore((state) => state.fetchToken)
  const csrfToken = useCSRFStore((state) => state.token)
  const csrfIsLoading = useCSRFStore((state) => state.isLoading)

	React.useEffect(() => {
		let cancelled = false

    const bootstrapSession = async () => {
      useAuthStore.setState({ isAuthenticated: false, isAuthResolved: false })
      try {
        const response = await verifyCurrentSession()
        if (!cancelled) {
          hydrateSession(response)
        }
      } catch (err) {
        if (!cancelled) {
          // Si el error es de red (offline), mantenemos el estado actual del store
          // Si es un error explícito de sesión inválida (401), el store debería resetearse
          const isNetworkError = !navigator.onLine || 
            (err instanceof Error && (
              err.message.toLowerCase().includes('network') || 
              err.message.toLowerCase().includes('fetch') ||
              err.message.toLowerCase().includes('failed to fetch') ||
              err.message.toLowerCase().includes('load failed')
            ));
          
          const currentState = useAuthStore.getState()
          useAuthStore.setState({
            isAuthenticated: isNetworkError && Boolean(currentState.userId),
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
  }, [hydrateSession])
  
  React.useEffect(() => {
    // Fetch CSRF token when user is authenticated and no token exists
    if (isAuthResolved && isAuthenticated && !csrfToken && !csrfIsLoading) {
      fetchToken()
    }
  }, [isAuthResolved, isAuthenticated, csrfToken, csrfIsLoading, fetchToken])

  return (
    <>
      <OfflineSyncManager />
      {children}
    </>
  )
}

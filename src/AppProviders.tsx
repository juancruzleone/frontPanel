import React from "react"
import { Toaster } from "sonner"
import { useTheme } from "./shared/hooks/useTheme"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { verifySession } from "./features/auth/services/loginServices"
import { OfflineSyncManager } from "./shared/components/OfflineSyncManager"

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
  const setAuthResolved = useAuthStore((state) => state.setAuthResolved)
  const fetchToken = useCSRFStore((state) => state.fetchToken)
  const csrfToken = useCSRFStore((state) => state.token)
  const csrfIsLoading = useCSRFStore((state) => state.isLoading)

	React.useEffect(() => {
		let cancelled = false

    const bootstrapSession = async () => {
      try {
        const response = await verifySession()
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
              err.message.toLowerCase().includes('failed to fetch')
            ));
          
          if (!isNetworkError) {
             // Solo si es un error de autenticación real (no de red)
             // podríamos forzar un logout, pero por ahora solo resolvemos
             // para dejar que los ProtectedRoutes decidan según el estado cacheado.
          }
          
          setAuthResolved(true)
        }
      }
    }

    bootstrapSession()

    return () => {
      cancelled = true
    }
  }, [hydrateSession, setAuthResolved])
  
  React.useEffect(() => {
    // Fetch CSRF token when user is authenticated and no token exists
    if (isAuthenticated && !csrfToken && !csrfIsLoading) {
      fetchToken()
    }
  }, [isAuthenticated, csrfToken, csrfIsLoading, fetchToken])

  return (
    <>
      <OfflineSyncManager />
      {children}
    </>
  )
}

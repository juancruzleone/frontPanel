import React from "react"
import { Toaster } from "sonner"
import { useTheme } from "./shared/hooks/useTheme"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { verifySession } from "./features/auth/services/loginServices"
import { installFetchCredentials } from "./shared/services/fetchCredentials"

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
  const setAuthResolved = useAuthStore((state) => state.setAuthResolved)
  const fetchToken = useCSRFStore((state) => state.fetchToken)
  const csrfToken = useCSRFStore((state) => state.token)
  const csrfIsLoading = useCSRFStore((state) => state.isLoading)

  React.useEffect(() => {
    installFetchCredentials()
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const bootstrapSession = async () => {
      try {
        const response = await verifySession()
        if (!cancelled) {
          hydrateSession(response)
        }
      } catch {
        if (!cancelled) {
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

  return <>{children}</>
}

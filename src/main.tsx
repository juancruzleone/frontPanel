import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { ThemeProvider, useTheme } from "./shared/hooks/useTheme"
import { Toaster } from "sonner"
import "./index.css"
import "../src/styles/font.css"
import "./i18n"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"

const ThemedToaster = () => {
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
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token)
  const fetchToken = useCSRFStore((state) => state.fetchToken)
  const csrfToken = useCSRFStore((state) => state.token)
  const csrfIsLoading = useCSRFStore((state) => state.isLoading)
  
  React.useEffect(() => {
    // Fetch CSRF token when user is authenticated and no token exists
    if (token && !csrfToken && !csrfIsLoading) {
      fetchToken()
    }
  }, [token, csrfToken, csrfIsLoading, fetchToken])

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedToaster />
      <AppInitializer>
        <RouterProvider router={router} />
      </AppInitializer>
    </ThemeProvider>
  </React.StrictMode>,
)
import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "../../src/store/authStore.ts"
import { useTranslatedRoutes } from "./useTranslatedRoutes"

const RedirectIfLogged = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved)
  const accessMode = useAuthStore((state) => state.accessMode)
  const { getRoute } = useTranslatedRoutes()

  if (!isAuthResolved) return null

  if (accessMode === "billing_only") return <Navigate to="/billing" replace />
  return user && isAuthenticated && accessMode === "full" ? <Navigate to={getRoute('installations')} replace /> : <Outlet />
}

export default RedirectIfLogged

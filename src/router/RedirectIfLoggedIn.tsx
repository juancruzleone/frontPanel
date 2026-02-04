import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"
import { useTranslatedRoutes } from "./useTranslatedRoutes"

const RedirectIfLogged = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { getRoute } = useTranslatedRoutes()

  return user && isAuthenticated ? <Navigate to={getRoute('installations')} replace /> : <Outlet />
}

export default RedirectIfLogged

import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"

const RedirectIfLogged = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return user && isAuthenticated ? <Navigate to="/instalaciones" replace /> : <Outlet />
}

export default RedirectIfLogged

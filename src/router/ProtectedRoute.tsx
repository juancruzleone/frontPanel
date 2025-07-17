import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!user || !isAuthenticated) return <Navigate to="/" replace />

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/inicio" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

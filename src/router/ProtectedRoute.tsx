import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"
import { isSuperAdmin, isTechnician, isAdmin } from "../shared/utils/roleUtils"

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!user || !isAuthenticated) return <Navigate to="/" replace />

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // Si es super_admin y no tiene acceso, redirigir al panel admin
    if (isSuperAdmin(role)) {
      return <Navigate to="/panel-admin" replace />
    }
    // Si es técnico y no tiene acceso, redirigir al inicio
    if (isTechnician(role)) {
      return <Navigate to="/inicio" replace />
    }
    // Si es admin y no tiene acceso, redirigir al inicio
    if (isAdmin(role)) {
      return <Navigate to="/inicio" replace />
    }
    // Por defecto, redirigir al inicio
    return <Navigate to="/inicio" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"
import { isSuperAdmin, isTechnician, isAdmin } from "../shared/utils/roleUtils"

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // DEBUG: Log para verificar el rol actual
  ,
    isAdminResult: isAdmin(role),
    isSuperAdminResult: isSuperAdmin(role)
  })

  if (!user || !isAuthenticated) return <Navigate to="/" replace />

  if (allowedRoles && role) {
    // Verificar si el rol actual está permitido usando las funciones de utilidad
    const hasAccess = allowedRoles.some(allowedRole => {
      if (allowedRole === 'super_admin') return isSuperAdmin(role)
      if (allowedRole === 'admin') return isAdmin(role)
      if (allowedRole === 'tecnico' || allowedRole === 'técnico') return isTechnician(role)
      return role === allowedRole
    })
    
    if (!hasAccess) {
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
  } else if (allowedRoles && !role) {
    return <Navigate to="/inicio" replace />
  }

  return <Outlet />
}

export default ProtectedRoute

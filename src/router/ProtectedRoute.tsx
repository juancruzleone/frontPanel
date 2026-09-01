import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "../../src/store/authStore.ts"
import { isSuperAdmin, isTechnician, isAdmin } from "../shared/utils/roleUtils"
import { useTranslatedRoutes } from "./useTranslatedRoutes"
import React from "react"

interface ProtectedRouteProps {
  allowedRoles?: string[]
  children?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthResolved = useAuthStore((state) => state.isAuthResolved)
  const accessMode = useAuthStore((state) => state.accessMode)
  const { getRoute } = useTranslatedRoutes()

  if (!isAuthResolved) return null

  if (accessMode === "billing_only") return <Navigate to="/billing" replace />
  if (!user || !isAuthenticated || accessMode !== "full") return <Navigate to="/" replace />

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
        return <Navigate to={getRoute('panelAdmin')} replace />
      }
      // Si es técnico y no tiene acceso, redirigir al inicio
      if (isTechnician(role)) {
        return <Navigate to={getRoute('home')} replace />
      }
      // Si es admin y no tiene acceso, redirigir al inicio
      if (isAdmin(role)) {
        return <Navigate to={getRoute('home')} replace />
      }
      // Por defecto, redirigir al inicio
      return <Navigate to={getRoute('home')} replace />
    }
  } else if (allowedRoles && !role) {
    return <Navigate to={getRoute('home')} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute

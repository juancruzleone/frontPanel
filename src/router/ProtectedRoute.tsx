import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "../../src/store/authStore.ts"
import { useOfflineTrustStore } from "../store/offlineTrustStore"
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
  const trustStatus = useOfflineTrustStore((state) => state.status)
  const trustResolved = useOfflineTrustStore((state) => state.resolved)
  const trustClaim = useOfflineTrustStore((state) => state.claim)
  const { getRoute } = useTranslatedRoutes()

  if (!isAuthResolved) return null

  if (!user || !isAuthenticated) return <Navigate to="/" replace />

  // Offline trust gate: only a valid signed lease (or the authenticated server
  // response when online) opens the route; editable roles cannot unlock it.
  if (!trustResolved) return null
  if (trustStatus !== "online-authenticated" && trustStatus !== "valid") return <Navigate to="/" replace />
  // Offline: permissions come from the signed lease claim, not editable storage.
  const offline = trustStatus === "valid"
  const effectiveRole = offline && trustClaim ? trustClaim.role : role

  if (allowedRoles && effectiveRole) {
    // Verificar si el rol actual está permitido usando las funciones de utilidad
    const hasAccess = allowedRoles.some(allowedRole => {
      if (allowedRole === 'super_admin') return isSuperAdmin(effectiveRole)
      if (allowedRole === 'admin') return isAdmin(effectiveRole)
      if (allowedRole === 'tecnico' || allowedRole === 'técnico') return isTechnician(effectiveRole)
      return effectiveRole === allowedRole
    })

    if (!hasAccess) {
      // Si es super_admin y no tiene acceso, redirigir al panel admin
      if (isSuperAdmin(effectiveRole)) {
        return <Navigate to={getRoute('panelAdmin')} replace />
      }
      // Para otros roles, redirigir al inicio
      return <Navigate to={getRoute('home')} replace />
    }
  } else if (allowedRoles && !effectiveRole) {
    return <Navigate to={getRoute('home')} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute

import React from 'react'
import { Navigate } from "react-router"
import { useAuthStore } from "../../src/store/authStore.ts"
import { useOfflineTrustStore } from "../store/offlineTrustStore"
import { isSuperAdmin, isTechnician, isAdmin, canAccessSection } from "../shared/utils/roleUtils"
import { useTranslatedRoutes } from "./useTranslatedRoutes"

interface RoleProtectedRouteProps {
  children: React.ReactNode
  section: string
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, section }) => {
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
  // response when online) opens the section; editable roles cannot unlock it.
  if (!trustResolved) return null
  if (trustStatus !== "online-authenticated" && trustStatus !== "valid") {
    return <Navigate to="/" replace />
  }

  // Offline: permissions come from the signed lease claim, not editable storage.
  const offline = trustStatus === "valid"
  const effectiveRole = offline && trustClaim ? trustClaim.role : role

  // Verificar si el usuario puede acceder a esta sección
  const canAccess = canAccessSection(effectiveRole, section)
  
  if (!canAccess) {
    // Si es super_admin y no tiene acceso, redirigir al panel admin
    if (isSuperAdmin(effectiveRole)) {
      return <Navigate to={getRoute('panelAdmin')} replace />
    }
    // Para otros roles, redirigir al inicio
    return <Navigate to={getRoute('home')} replace />
  }

  return <>{children}</>
}

export default RoleProtectedRoute 

import React from 'react'
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"
import { isSuperAdmin, isTechnician, isAdmin, canAccessSection } from "../shared/utils/roleUtils"

interface RoleProtectedRouteProps {
  children: React.ReactNode
  section: string
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, section }) => {
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!user || !isAuthenticated) return <Navigate to="/" replace />

  // Verificar si el usuario puede acceder a esta sección
  const canAccess = canAccessSection(role, section)
  
  if (!canAccess) {
    console.log(`Acceso denegado: Usuario ${user} con rol ${role} intentó acceder a ${section}`)
    
    // Si es super_admin y no tiene acceso, redirigir al panel admin
    if (isSuperAdmin(role)) {
      return <Navigate to="/panel-admin" replace />
    }
    // Para otros roles, redirigir al inicio
    return <Navigate to="/inicio" replace />
  }

  return <>{children}</>
}

export default RoleProtectedRoute 
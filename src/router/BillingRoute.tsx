import type { ReactNode } from "react"
import { Navigate, Outlet } from "react-router"
import { useAuthStore } from "@/store/authStore"
import { isAdmin } from "@/shared/utils/roleUtils"

export interface BillingRouteProps {
  children?: ReactNode
}

export const BillingRoute = ({ children }: BillingRouteProps) => {
  const { accessMode, isAuthenticated, isAuthResolved, role } = useAuthStore()
  if (!isAuthResolved) return null

  const allowed = accessMode === "billing_only" || (accessMode === "full" && isAuthenticated && isAdmin(role))
  if (!allowed) return <Navigate to="/" replace />
  return children ? <>{children}</> : <Outlet />
}

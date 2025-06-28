import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../../src/store/authStore.ts"

const ProtectedRoute = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return user && isAuthenticated ? <Outlet /> : <Navigate to="/" replace />
}

export default ProtectedRoute

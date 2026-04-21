import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useCSRFStore } from "./csrfStore"

const AUTH_STORAGE_KEY = "auth-storage"

const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

interface UserData {
  userName?: string
  username?: string
  _id?: string
  role?: string
  tenantId?: string
  permissions?: string[]
}

interface LoginData {
  user?: UserData
  cuenta?: UserData
  token?: string | null
}

export interface UserPermissions {
  canCreateWorkOrders?: boolean
  canEditWorkOrders?: boolean
  canDeleteWorkOrders?: boolean
  canAssignWorkOrders?: boolean
  canStartWorkOrder?: boolean
  canCompleteWorkOrder?: boolean
  canViewWorkOrders?: boolean
  [key: string]: boolean | undefined
}

interface AuthState {
  user: string | null
  userId: string | null
  token: string | null
  role: string | null
  tenantId: string | null
  permissions: string[] | UserPermissions | null
  isAuthenticated: boolean
  isAuthResolved: boolean
  logoutMessage: string | null
  login: (data: LoginData) => void
  hydrateSession: (data: LoginData) => void
  setAuthenticated: (value: boolean) => void
  setAuthResolved: (value: boolean) => void
  setLogoutMessage: (msg: string | null) => void
  setTenantId: (tenantId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userId: null,
      token: null,
      role: null,
      tenantId: null,
      permissions: null,
      isAuthenticated: false,
      isAuthResolved: false,
      logoutMessage: null,
      login: (data) => {
        // El backend devuelve 'cuenta' en lugar de 'user'
        const user = data.user || data.cuenta

        // Validar que los datos necesarios existan
        if (!user) {
          return
        }

        set({
          user: user.userName || user.username || user._id || null,
          userId: user._id || null,
          token: data.token || null,
          role: user.role || null,
          tenantId: user.tenantId || null,
          permissions: user.permissions || null,
          isAuthenticated: false, // No autenticar hasta que se cierre el modal
          isAuthResolved: true,
        })
      },
      hydrateSession: (data) => {
        const user = data.user || data.cuenta

        if (!user) {
          set({ isAuthResolved: true, isAuthenticated: false })
          return
        }

        set({
          user: user.userName || user.username || user._id || null,
          userId: user._id || null,
          token: null,
          role: user.role || null,
          tenantId: user.tenantId || null,
          permissions: user.permissions || null,
          isAuthenticated: true,
          isAuthResolved: true,
        })
      },
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setAuthResolved: (value) => set({ isAuthResolved: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () => {
        // Clear CSRF token on logout using action
        useCSRFStore.getState().clearToken()
        
        set({
          user: null,
          userId: null,
          token: null,
          role: null,
          tenantId: null,
          permissions: null,
          isAuthenticated: false,
          isAuthResolved: true,
        })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

clearLegacyAuthStorage()

// Selector para obtener el rol
export const selectRole = (state: AuthState) => state.role

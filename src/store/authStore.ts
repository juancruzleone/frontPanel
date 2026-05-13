import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useCSRFStore } from "./csrfStore"
import { useInstallationStore } from "./installationStore"
import { useWorkOrderStore } from "./workOrderStore"

const AUTH_STORAGE_KEY = "auth-storage"

const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return
  
  // Limpiar localStorage (legacy)
  window.localStorage.removeItem(AUTH_STORAGE_KEY)

  // Limpiar token de sessionStorage si existe en el objeto persistido (limpieza estructural)
  try {
    const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.state && (parsed.state.token !== undefined && parsed.state.token !== null)) {
        delete parsed.state.token
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed))
      }
    }
  } catch {
    // Silently fail if parsing fails
  }
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
    (set) => ({
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
          token: null, // Ya no guardamos el token en el store persistido
          role: user.role || null,
          tenantId: user.tenantId || null,
          permissions: user.permissions || null,
          isAuthenticated: false, // No autenticar hasta que se cierre el modal
          isAuthResolved: true,
        })
        
        const userId = user._id || null
        
        const instStore = useInstallationStore.getState()
        if (instStore.ownerId !== userId) {
          if (instStore.installations?.length > 0) instStore.setInstallations([])
          if (instStore.assets?.length > 0) instStore.setAssets([])
        }
        instStore.setOwnerId(userId)

        const woStore = useWorkOrderStore.getState()
        if (woStore.ownerId !== userId) {
          if (woStore.workOrders?.length > 0) woStore.setWorkOrders([])
        }
        woStore.setOwnerId(userId)
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
        
        const userId = user._id || null
        
        const instStore = useInstallationStore.getState()
        if (instStore.ownerId !== userId) {
          if (instStore.installations?.length > 0) instStore.setInstallations([])
          if (instStore.assets?.length > 0) instStore.setAssets([])
        }
        instStore.setOwnerId(userId)

        const woStore = useWorkOrderStore.getState()
        if (woStore.ownerId !== userId) {
          if (woStore.workOrders?.length > 0) woStore.setWorkOrders([])
        }
        woStore.setOwnerId(userId)
      },
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setAuthResolved: (value) => set({ isAuthResolved: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () => {
        // Clear CSRF token on logout using action
        useCSRFStore.getState().clearToken()
        
        // Clear cached stores to prevent cross-user leakage
        useInstallationStore.getState().setInstallations([])
        useInstallationStore.getState().setAssets([])
        useInstallationStore.getState().setOwnerId(null)
        useWorkOrderStore.getState().setWorkOrders([])
        useWorkOrderStore.getState().setOwnerId(null)
        
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { token, ...rest } = state
        return rest
      },
    }
  )
)

// clearLegacyAuthStorage()

// Selector para obtener el rol
export const selectRole = (state: AuthState) => state.role

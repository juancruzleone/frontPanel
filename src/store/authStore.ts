import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useCSRFStore } from "./csrfStore"
import { useInstallationStore } from "./installationStore"
import { useNotificationStore } from "./notificationStore"
import { useWorkOrderStore } from "./workOrderStore"
import { useInventoryStore } from "./inventoryStore"
import { useSupplierStore } from "./supplierStore"
import { useAuditStore } from "./auditStore"
import { useHomeStore } from "./homeStore"
import { useTechnicianStore } from "./technicianStore"
import { useSettingsStore } from "./settingsStore"
import { useMaintenanceStore } from "./maintenanceStore"
import { useOfflineStore } from "./offlineStore"
import { useOfflineTrustStore } from "./offlineTrustStore"
import { type OfflineIdentityScope, getOrCreateDeviceId } from "../shared/offline/types"
import { purgeScopeData, purgeEncryptedScope } from "../shared/offline/storage"

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
  logout: () => Promise<void>
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

        const userId = user._id || null

        // Sincronizar ownerId en todos los stores
        useInstallationStore.getState().setOwnerId(userId)
        useWorkOrderStore.getState().setOwnerId(userId)
        useInventoryStore.getState().setOwnerId(userId)
        useSupplierStore.getState().setOwnerId(userId)
        useAuditStore.getState().setOwnerId(userId)
        useHomeStore.getState().setOwnerId(userId)
        useTechnicianStore.getState().setOwnerId(userId)
        useSettingsStore.getState().setOwnerId(userId)
        useMaintenanceStore.getState().setOwnerId(userId)
        useNotificationStore.getState().setNotificationOwner(userId)

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
      },
      hydrateSession: (data) => {
        const user = data.user || data.cuenta

        if (!user) {
          set({ isAuthResolved: true, isAuthenticated: false })
          return
        }

        const userId = user._id || null

        // Sincronizar ownerId en todos los stores ANTES de resolver la autenticación
        // para evitar condiciones de carrera en componentes que montan inmediatamente
        useInstallationStore.getState().setOwnerId(userId)
        useWorkOrderStore.getState().setOwnerId(userId)
        useInventoryStore.getState().setOwnerId(userId)
        useSupplierStore.getState().setOwnerId(userId)
        useAuditStore.getState().setOwnerId(userId)
        useHomeStore.getState().setOwnerId(userId)
        useTechnicianStore.getState().setOwnerId(userId)
        useSettingsStore.getState().setOwnerId(userId)
        useMaintenanceStore.getState().setOwnerId(userId)
        useNotificationStore.getState().setNotificationOwner(userId)

        // Ahora sí, resolver la autenticación
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
      logout: async () => {
        // Capture scope before clearing auth state for offline data purge
        const tenantId = useAuthStore.getState().tenantId
        const userId = useAuthStore.getState().userId
        let currentScope: OfflineIdentityScope | null = null
        if (tenantId && userId) {
          currentScope = { tenantId, userId, deviceId: getOrCreateDeviceId() }
        }

        // Clear CSRF token on logout using action
        useCSRFStore.getState().clearToken()

        // Clear cached stores to prevent cross-user leakage
        useInstallationStore.getState().setInstallations([])
        useInstallationStore.getState().setAssets([])
        useInstallationStore.getState().setOwnerId(null)
        useWorkOrderStore.getState().setWorkOrders([])
        useWorkOrderStore.getState().setOwnerId(null)

        useInventoryStore.getState().setItems([], 0)
        useInventoryStore.getState().setOwnerId(null)
        useSupplierStore.getState().setSuppliers([], 0)
        useSupplierStore.getState().setOwnerId(null)
        useAuditStore.getState().setLogs([])
        useAuditStore.getState().setOwnerId(null)
        useHomeStore.getState().setDashboardData(null)
        useHomeStore.getState().setOwnerId(null)
        useTechnicianStore.getState().setTechnicians([])
        useTechnicianStore.getState().setOwnerId(null)
        useSettingsStore.getState().setOwnerId(null)
        useMaintenanceStore.getState().clearAll()
        useMaintenanceStore.getState().setOwnerId(null)

        useNotificationStore.getState().setNotificationOwner(null)

        // R9: Verified purge — await encrypted scope purge before clearing auth.
        // Gate identity switch: purge must complete before next identity opens.
        if (currentScope) {
          const scopeKey = `${currentScope.tenantId}:${currentScope.userId}:${currentScope.deviceId}`
          useOfflineStore.getState().clearQueueForScope(currentScope)
          useOfflineStore.getState().clearDeadLettersForScope(scopeKey)

          // Await both purge paths — never fire-and-forget
          try {
            await purgeScopeData(currentScope)
          } catch {
            // Purge failures never block logout; data is sealed by scope mismatch
          }
          try {
            await purgeEncryptedScope(currentScope)
          } catch {
            // Encrypted purge failures never block logout
          }
        }

        // Destroy trust material (device key + signed lease) for the departing identity
        if (tenantId && userId) {
          try {
            await useOfflineTrustStore.getState().clearForScope(tenantId, userId)
          } catch {
            // Trust purge failures never block logout; records stay scope-sealed
          }
        }

        // Notify Service Worker to clear API cache
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "LOGOUT" });
        }

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

// Reconcile the signed offline lease whenever an authenticated session exists
// and the trust store has not resolved yet. This covers offline shell reloads
// where session verification never reaches the server (verifySession fails on
// network errors), so the lease gate is always evaluated from IndexedDB.
useAuthStore.subscribe((state) => {
  if (
    state.isAuthenticated &&
    state.isAuthResolved &&
    state.userId &&
    state.tenantId &&
    !useOfflineTrustStore.getState().resolved
  ) {
    void useOfflineTrustStore.getState().reconcile(state.tenantId, state.userId)
  }
})

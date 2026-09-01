import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { useCSRFStore } from "./csrfStore"
import { useOfflineTrustStore } from "./offlineTrustStore"
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
import { useComplianceStore } from "./complianceStore"

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

export type AccessMode = "full" | "billing_only" | "anonymous"

export interface TrialSummary {
  status: string
  plan: "starter" | "professional" | "enterprise"
  startsAt: string
  endsAt: string
}

export interface BillingTenantSummary {
  tenantId: string
  name: string
  plan: string
  status: string
}

export interface LoginResponse {
  user?: UserData
  cuenta?: UserData
  token?: string | null
  authenticated?: boolean
  accessMode?: "full" | "billing_only"
  trial?: TrialSummary | null
  billingSession?: { expiresAt: string }
  csrfToken?: string
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
  accessMode: AccessMode
  trial: TrialSummary | null
  billingTenant: BillingTenantSummary | null
  billingSessionExpiresAt: string | null
  logoutMessage: string | null
  login: (data: LoginResponse) => void
  hydrateSession: (data: LoginResponse) => void
  enterBillingOnly: (data: LoginResponse) => void
  setBillingContext: (data: { accessMode: "full" | "billing_only" | "denied"; trial: TrialSummary | null; tenant: BillingTenantSummary | null }) => void
  setAuthenticated: (value: boolean) => void
  setAuthResolved: (value: boolean) => void
  setLogoutMessage: (msg: string | null) => void
  setTenantId: (tenantId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      user: null,
      userId: null,
      token: null,
      role: null,
      tenantId: null,
      permissions: null,
      isAuthenticated: false,
      isAuthResolved: false,
      accessMode: "anonymous",
      trial: null,
      billingTenant: null,
      billingSessionExpiresAt: null,
      logoutMessage: null,
      login: (data) => {
        // El backend devuelve 'cuenta' en lugar de 'user'
        const user = data.user || data.cuenta

        // Validar que los datos necesarios existan
        if (!user) {
          return
        }

        const userId = user._id || null
        const ownerScope = user.tenantId && userId ? `${user.tenantId}:${userId}` : userId

        // Sincronizar ownerId en todos los stores
        useInstallationStore.getState().setOwnerId(ownerScope)
        useWorkOrderStore.getState().setOwnerId(userId)
        useInventoryStore.getState().setOwnerId(userId)
        useSupplierStore.getState().setOwnerId(userId)
        useAuditStore.getState().setOwnerId(userId)
        useHomeStore.getState().setOwnerId(userId)
        useTechnicianStore.getState().setOwnerId(userId)
        useSettingsStore.getState().setOwnerId(userId)
        useMaintenanceStore.getState().setOwnerId(userId)
        useComplianceStore.getState().setOwnerId(ownerScope)
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
          accessMode: "full",
        })
      },
      hydrateSession: (data) => {
        const user = data.user || data.cuenta

        if (!user) {
          set({ isAuthResolved: true, isAuthenticated: false })
          return
        }

        const userId = user._id || null
        const ownerScope = user.tenantId && userId ? `${user.tenantId}:${userId}` : userId

        // Sincronizar ownerId en todos los stores ANTES de resolver la autenticación
        // para evitar condiciones de carrera en componentes que montan inmediatamente
        useInstallationStore.getState().setOwnerId(ownerScope)
        useWorkOrderStore.getState().setOwnerId(userId)
        useInventoryStore.getState().setOwnerId(userId)
        useSupplierStore.getState().setOwnerId(userId)
        useAuditStore.getState().setOwnerId(userId)
        useHomeStore.getState().setOwnerId(userId)
        useTechnicianStore.getState().setOwnerId(userId)
        useSettingsStore.getState().setOwnerId(userId)
        useMaintenanceStore.getState().setOwnerId(userId)
        useComplianceStore.getState().setOwnerId(ownerScope)
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
          accessMode: "full",
        })
      },
      enterBillingOnly: (data) => set({
        user: null,
        userId: null,
        role: null,
        tenantId: null,
        permissions: null,
        isAuthenticated: false,
        isAuthResolved: true,
        accessMode: "billing_only",
        trial: data.trial || null,
        billingSessionExpiresAt: data.billingSession?.expiresAt || null,
      }),
      setBillingContext: (data) => {
        const currentState = useAuthStore.getState()
        const canEnterFullAccess = data.accessMode === "full" && currentState.isAuthenticated
        set({
          accessMode: data.accessMode === "denied"
            ? "anonymous"
            : canEnterFullAccess
              ? "full"
              : data.accessMode === "full"
                ? currentState.accessMode
                : data.accessMode,
          trial: data.trial,
          billingTenant: data.tenant,
          isAuthenticated: canEnterFullAccess,
          isAuthResolved: true,
        })
      },
      setAuthenticated: (value) => set({ isAuthenticated: value, accessMode: value ? "full" : useAuthStore.getState().accessMode }),
      setAuthResolved: (value) => set({ isAuthResolved: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () => {
        // Capture departing identity for selective purge
        const departingTenantId = useAuthStore.getState().tenantId
        const departingUserId = useAuthStore.getState().userId

        // Clear CSRF token on logout using action
        useCSRFStore.getState().clearToken()
        
        // Clear offline trust state — prevents cross-user leakage
        useOfflineTrustStore.getState().clearTrust()

        // Selective purge: remove only draft keys for departing identity
        if (departingTenantId && departingUserId) {
          import('../shared/offline/lifecycleStart').then(m => m.purgeOfflineDraftsForScope(departingTenantId, departingUserId)).catch(() => {})
        }

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
        useComplianceStore.getState().setOwnerId(null)

        useNotificationStore.getState().setNotificationOwner(null)
        
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
          accessMode: "anonymous",
          trial: null,
          billingTenant: null,
          billingSessionExpiresAt: null,
        })
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { user, userId, role, tenantId, permissions, accessMode, trial, billingTenant, billingSessionExpiresAt } = state
        return { user, userId, role, tenantId, permissions, accessMode, trial, billingTenant, billingSessionExpiresAt }
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState>
        return {
          ...currentState,
          user: persisted.user ?? null,
          userId: persisted.userId ?? null,
          role: persisted.role ?? null,
          tenantId: persisted.tenantId ?? null,
          permissions: persisted.permissions ?? null,
          accessMode: persisted.accessMode ?? "anonymous",
          trial: persisted.trial ?? null,
          billingTenant: persisted.billingTenant ?? null,
          billingSessionExpiresAt: persisted.billingSessionExpiresAt ?? null,
          isAuthenticated: false,
          isAuthResolved: false,
        }
      },
    }
  )
)

// clearLegacyAuthStorage()

// Selector para obtener el rol
export const selectRole = (state: AuthState) => state.role

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  user: string | null
  token: string | null
  role: string | null
  tenantId: string | null
  permissions: any | null
  isAuthenticated: boolean
  logoutMessage: string | null
  login: (data: { user: any, token: string }) => void
  setAuthenticated: (value: boolean) => void
  setLogoutMessage: (msg: string | null) => void
  setTenantId: (tenantId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      tenantId: null,
      permissions: null,
      isAuthenticated: false,
      logoutMessage: null,
      login: (data) => set({
        user: data.user.userName || data.user._id,
        token: data.token,
        role: data.user.role,
        tenantId: data.user.tenantId,
        permissions: data.user.permissions || null,
        isAuthenticated: true
      }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () =>
        set({
          user: null,
          token: null,
          role: null,
          tenantId: null,
          permissions: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
)

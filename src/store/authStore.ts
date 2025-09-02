import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  user: string | null
  token: string | null
  role: string | null
  tenantId: string | null
  isAuthenticated: boolean
  logoutMessage: string | null
  setUser: (user: string, token: string, role: string, tenantId: string) => void
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
      isAuthenticated: false,
      logoutMessage: null,
      setUser: (user, token, role, tenantId) => set({ user, token, role, tenantId }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () =>
        set({
          user: null,
          token: null,
          role: null,
          tenantId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
)

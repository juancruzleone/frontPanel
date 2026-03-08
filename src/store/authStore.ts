import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  user: string | null
  userId: string | null
  token: string | null
  role: string | null
  tenantId: string | null
  permissions: any | null
  isAuthenticated: boolean
  logoutMessage: string | null
  login: (data: { user?: any, cuenta?: any, token: string }) => void
  setAuthenticated: (value: boolean) => void
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
      logoutMessage: null,
      login: (data) => {
        // El backend devuelve 'cuenta' en lugar de 'user'
        const user = data.user || data.cuenta;

        // Validar que los datos necesarios existan
        if (!user) {
          return;
        }

        set({
          user: user.userName || user.username || user._id || null,
          userId: user._id || null,
          token: data.token || null,
          role: user.role || null,
          tenantId: user.tenantId || null,
          permissions: user.permissions || null,
          isAuthenticated: false // No autenticar hasta que se cierre el modal
        });
      },
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      setTenantId: (tenantId) => set({ tenantId }),
      logout: () =>
        set({
          user: null,
          userId: null,
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

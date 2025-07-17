import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  user: string | null
  token: string | null
  role: string | null
  isAuthenticated: boolean
  logoutMessage: string | null
  setUser: (user: string, token: string, role: string) => void
  setAuthenticated: (value: boolean) => void
  setLogoutMessage: (msg: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      logoutMessage: null,
      setUser: (user, token, role) => set({ user, token, role }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      logout: () =>
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
)

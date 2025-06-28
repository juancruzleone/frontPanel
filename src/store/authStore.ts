import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  user: string | null
  token: string | null
  isAuthenticated: boolean
  logoutMessage: string | null
  setUser: (user: string, token: string) => void
  setAuthenticated: (value: boolean) => void
  setLogoutMessage: (msg: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      logoutMessage: null,
      setUser: (user, token) => set({ user, token }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLogoutMessage: (msg) => set({ logoutMessage: msg }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
)

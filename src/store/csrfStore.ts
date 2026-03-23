import { create } from "zustand"
import { persist } from "zustand/middleware"
import { fetchCsrfToken } from "@/shared/services/csrfServices"

interface CSRFState {
  token: string | null
  isLoading: boolean
  error: string | null
  fetchToken: () => Promise<void>
  clearToken: () => void
}

export const useCSRFStore = create<CSRFState>()(
  persist(
    (set) => ({
      token: null,
      isLoading: false,
      error: null,
      fetchToken: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetchCsrfToken()
          set({ token: response.token, isLoading: false })
        } catch (error: unknown) {
          const message = error instanceof Error && error.message ? error.message : "Error al obtener token CSRF"
          set({ 
            error: message, 
            isLoading: false 
          })
        }
      },
      clearToken: () => set({ token: null, error: null }),
    }),
    {
      name: "csrf-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
)
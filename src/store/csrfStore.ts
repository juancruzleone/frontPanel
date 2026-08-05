import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { fetchCsrfToken } from "@/shared/services/csrfServices"

const CSRF_STORAGE_KEY = "csrf-storage"
let csrfStorePromise: Promise<void> | null = null

const clearLegacyCsrfStorage = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(CSRF_STORAGE_KEY)
}

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
        if (csrfStorePromise) return csrfStorePromise
        set({ isLoading: true, error: null })
        csrfStorePromise = (async () => {
          try {
            const response = await fetchCsrfToken()
            set({ token: response.token, isLoading: false })
          } catch (error: unknown) {
            const message = error instanceof Error && error.message ? error.message : "Error al obtener token CSRF"
            set({ error: message, isLoading: false })
          } finally {
            csrfStorePromise = null
          }
        })()
        return csrfStorePromise
      },
      clearToken: () => set({ token: null, error: null }),
    }),
    {
      name: CSRF_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ token: state.token }),
    }
  )
)

clearLegacyCsrfStorage()

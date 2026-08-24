import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { HomeDashboardCache } from "../features/home/types/homeTypes"

export const HOME_SCOPE_VERSION = "role-scope-v1"

interface HomeState {
  cache: HomeDashboardCache | null
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setDashboardData: (data: HomeDashboardCache | null) => void
}

export const buildHomeCacheKey = (
  tenantId: string | null,
  userId: string | null,
  role: string | null,
): string | null => {
  if (!tenantId || !userId || !role) return null
  return `${tenantId}:${userId}:${role}:${HOME_SCOPE_VERSION}`
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      cache: null,
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) => set((state) => state.ownerId === id ? state : {
        ownerId: id,
        cache: null,
        lastUpdated: null,
      }),
      setDashboardData: (cache) => set({ cache, lastUpdated: cache ? Date.now() : null }),
    }),
    {
      name: "home-storage",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: () => ({ cache: null, lastUpdated: null, ownerId: null }),
      partialize: ({ cache, lastUpdated, ownerId }) => ({ cache, lastUpdated, ownerId }),
    },
  ),
)

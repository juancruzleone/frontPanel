import { create } from "zustand"
import { persist } from "zustand/middleware"

interface HomeState {
  dashboardData: any | null
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setDashboardData: (data: any) => void
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      dashboardData: null,
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) => set({ ownerId: id }),
      setDashboardData: (data) => set({ dashboardData: data, lastUpdated: Date.now() }),
    }),
    { name: "home-storage" }
  )
)

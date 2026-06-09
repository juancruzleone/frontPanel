import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Technician } from "../features/workOrders/hooks/useWorkOrders"

interface TechnicianState {
  technicians: Technician[]
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setTechnicians: (technicians: Technician[]) => void
}

export const useTechnicianStore = create<TechnicianState>()(
  persist(
    (set) => ({
      technicians: [],
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            technicians: [],
            lastUpdated: null,
          }
        }),
      setTechnicians: (technicians) => set({ technicians, lastUpdated: Date.now() }),
    }),
    { name: "technician-storage" }
  )
)

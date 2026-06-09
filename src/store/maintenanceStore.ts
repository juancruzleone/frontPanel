import { create } from "zustand"
import { persist } from "zustand/middleware"
import { MaintenanceRecord } from "../features/deviceForms/services/maintenanceHistoryService"

interface MaintenanceState {
  historyByDevice: Record<string, MaintenanceRecord[]>
  lastMaintenanceByDevice: Record<string, MaintenanceRecord | null>
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setHistory: (deviceId: string, history: MaintenanceRecord[]) => void
  setLastMaintenance: (deviceId: string, maintenance: MaintenanceRecord | null) => void
  clearAll: () => void
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set) => ({
      historyByDevice: {},
      lastMaintenanceByDevice: {},
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            historyByDevice: {},
            lastMaintenanceByDevice: {},
            lastUpdated: null,
          }
        }),
      setHistory: (deviceId, history) =>
        set((state) => ({
          historyByDevice: {
            ...state.historyByDevice,
            [deviceId]: history,
          },
          lastUpdated: Date.now(),
        })),
      setLastMaintenance: (deviceId, maintenance) =>
        set((state) => ({
          lastMaintenanceByDevice: {
            ...state.lastMaintenanceByDevice,
            [deviceId]: maintenance,
          },
          lastUpdated: Date.now(),
        })),
      clearAll: () => set({ historyByDevice: {}, lastMaintenanceByDevice: {}, lastUpdated: null }),
    }),
    { name: "maintenance-storage" }
  )
)

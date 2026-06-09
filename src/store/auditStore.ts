import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AuditLog } from "../features/audit/types/audit.types"

interface AuditState {
  logs: AuditLog[]
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setLogs: (logs: AuditLog[]) => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      logs: [],
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            logs: [],
            lastUpdated: null,
          }
        }),
      setLogs: (logs) => set({ logs, lastUpdated: Date.now() }),
    }),
    { name: "audit-storage" }
  )
)

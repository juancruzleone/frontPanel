import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"

export interface QueuedRequest {
  id: string
  userId?: string | null
  type: 
    | 'CREATE_WORK_ORDER' | 'UPDATE_WORK_ORDER' | 'DELETE_WORK_ORDER'
    | 'ASSIGN_WORK_ORDER_TECHNICIAN' | 'UPDATE_WORK_ORDER_STATUS'
    | 'COMPLETE_WORK_ORDER' | 'START_WORK_ORDER'
    | 'CREATE_INSTALLATION' | 'UPDATE_INSTALLATION' | 'DELETE_INSTALLATION'
    | 'ADD_INSTALLATION_DEVICE' | 'REMOVE_INSTALLATION_DEVICE' | 'DEVICE_MAINTENANCE'
  payload: Record<string, unknown>
  metadata?: {
    installationId?: string
    deviceId?: string
  }
  timestamp: number
  retries?: number
  lastError?: string
}

interface OfflineState {
  queue: QueuedRequest[]
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => void
  removeFromQueue: (id: string) => void
  updateRequest: (id: string, data: Partial<QueuedRequest>) => void
  remapPayloadId: (oldId: string, newId: string) => void
  clearQueue: () => void
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queue: [],
      addToQueue: (request) => {
        let userId = null
        try {
          const authState = window.localStorage.getItem('auth-storage')
          if (authState) {
            userId = JSON.parse(authState).state?.userId || null
          }
        } catch (e) {
          // Ignore
        }
        return set((state) => ({
          queue: [
            ...state.queue,
            {
              ...request,
              id: crypto.randomUUID(),
              userId,
              timestamp: Date.now(),
              retries: 0
            },
          ],
        }))
      },
      removeFromQueue: (id) =>
        set((state) => ({
          queue: state.queue.filter((req) => req.id !== id),
        })),
      updateRequest: (id, data) =>
        set((state) => ({
          queue: state.queue.map((req) => (req.id === id ? { ...req, ...data } : req)),
        })),
      remapPayloadId: (oldId, newId) =>
        set((state) => {
          const replaceIdRecursively = (obj: unknown): unknown => {
            if (obj === oldId) return newId
            if (Array.isArray(obj)) return obj.map(replaceIdRecursively)
            if (obj !== null && typeof obj === 'object') {
              const newObj: Record<string, unknown> = {}
              for (const [key, value] of Object.entries(obj)) {
                newObj[key] = replaceIdRecursively(value)
              }
              return newObj
            }
            return obj
          }
          return {
            queue: state.queue.map((req) => ({
              ...req,
              payload: replaceIdRecursively(req.payload) as Record<string, unknown>
            })),
          }
        }),
      clearQueue: () => set({ queue: [] }),
    }),
    { 
      name: "offline-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)

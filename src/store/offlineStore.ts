import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { useAuthStore } from "./authStore"

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
  binaryRefs?: {
    id: string
    field: string
    filename: string
    contentType: string
    size: number
  }[]
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
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'userId'>, ownerId?: string) => boolean
  queueInstallationUpdate: (ownerId: string, installationId: string, data: Record<string, unknown>) => boolean
  removeFromQueue: (id: string) => void
  updateRequest: (id: string, data: Partial<QueuedRequest>) => void
  remapPayloadId: (oldId: string, newId: string) => void
  clearQueue: () => void
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queue: [],
      addToQueue: (request, ownerId) => {
        let queued = false
        set((state) => {
          const currentUserId = useAuthStore.getState().userId
          if (!currentUserId || (ownerId !== undefined && currentUserId !== ownerId)) return state
          queued = true
          return {
            queue: [
              ...state.queue,
              {
                ...request,
                id: crypto.randomUUID(),
                userId: currentUserId,
                timestamp: Date.now(),
                retries: 0
              },
            ],
          }
        })
        return queued
      },
      queueInstallationUpdate: (ownerId, installationId, data) => {
        let queued = false
        set((state) => {
          if (!ownerId || useAuthStore.getState().userId !== ownerId) return state

          const matchingIndexes = state.queue.reduce<number[]>((indexes, request, index) => {
            if (
              request.type === 'UPDATE_INSTALLATION' &&
              request.userId === ownerId &&
              request.payload.id === installationId
            ) indexes.push(index)
            return indexes
          }, [])
          const firstMatch = matchingIndexes[0]
          const payload = { id: installationId, data }
          queued = true

          if (firstMatch === undefined) {
            return {
              queue: [...state.queue, {
                id: crypto.randomUUID(),
                userId: ownerId,
                type: 'UPDATE_INSTALLATION',
                payload,
                timestamp: Date.now(),
                retries: 0,
              }],
            }
          }

          const duplicateIndexes = new Set(matchingIndexes.slice(1))
          return {
            queue: state.queue.flatMap((request, index) => {
              if (duplicateIndexes.has(index)) return []
              if (index !== firstMatch) return [request]
              const updatedRequest = { ...request, payload, retries: 0 }
              delete updatedRequest.lastError
              return [updatedRequest]
            }),
          }
        })
        return queued
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

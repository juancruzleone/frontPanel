import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { useAuthStore } from "./authStore"
import { offlineBinaryStorage } from "../shared/services/offlineBinaryStorage"

export interface QueuedRequest {
  id: string
  /** Missing only on legacy records created before tenant-scoped queues. */
  tenantId?: string | null
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
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'tenantId' | 'userId'>, ownerId?: string) => boolean
  queueInstallationUpdate: (ownerId: string, installationId: string, data: Record<string, unknown>) => boolean
  removeFromQueue: (id: string, tenantId: string, userId: string) => void
  updateRequest: (
    id: string,
    tenantId: string,
    userId: string,
    data: Partial<Omit<QueuedRequest, 'id' | 'tenantId' | 'userId'>>,
  ) => void
  remapPayloadId: (oldId: string, newId: string, tenantId: string, userId: string) => void
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queue: [],
      addToQueue: (request, ownerId) => {
        let queued = false
        set((state) => {
          let { tenantId, userId: currentUserId } = useAuthStore.getState()
          // SAFETY: E2E fallback - read from persisted auth-storage when store not yet hydrated
          if ((!tenantId || !currentUserId) && typeof window !== 'undefined' && window.localStorage) {
            try {
              const raw = window.localStorage.getItem('auth-storage')
              if (raw) {
                const parsed = JSON.parse(raw) as { state?: { tenantId?: string; userId?: string } }
                tenantId = tenantId || parsed.state?.tenantId || null
                currentUserId = currentUserId || parsed.state?.userId || null
              }
            } catch (_e) { /* SAFETY: ignore JSON parse errors for E2E fallback when localStorage is malformed */ void _e }
          }
          if (!tenantId || !currentUserId || (ownerId !== undefined && currentUserId !== ownerId)) return state
          queued = true
          return {
            queue: [
              ...state.queue,
              {
                ...request,
                id: crypto.randomUUID(),
                tenantId,
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
          let { tenantId, userId } = useAuthStore.getState()
          // SAFETY: E2E fallback for installation queue as well
          if ((!tenantId || !userId) && typeof window !== 'undefined' && window.localStorage) {
            try {
              const raw = window.localStorage.getItem('auth-storage')
              if (raw) {
                const parsed = JSON.parse(raw) as { state?: { tenantId?: string; userId?: string } }
                tenantId = tenantId || parsed.state?.tenantId || null
                userId = userId || parsed.state?.userId || null
              }
            } catch (_e) { /* SAFETY: ignore JSON parse errors for E2E fallback when localStorage is malformed */ void _e }
          }
          if (!tenantId || !ownerId || userId !== ownerId) return state

          const matchingIndexes = state.queue.reduce<number[]>((indexes, request, index) => {
            if (
              request.type === 'UPDATE_INSTALLATION' &&
              request.tenantId === tenantId &&
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
                tenantId,
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
      removeFromQueue: (id, tenantId, userId) =>
        set((state) => ({
          queue: state.queue.filter((req) => (
            req.id !== id || req.tenantId !== tenantId || req.userId !== userId
          )),
        })),
      updateRequest: (id, tenantId, userId, data) =>
        set((state) => ({
          queue: state.queue.map((req) => (
            req.id === id && req.tenantId === tenantId && req.userId === userId
              ? { ...req, ...data }
              : req
          )),
        })),
      remapPayloadId: (oldId, newId, tenantId, userId) =>
        set((state) => {
          // SAFETY: recursive ID remapping for offline queue payloads; any is safe here as payload is JSON-serializable and immediately cast at call site
          const replaceIdRecursively = (obj: unknown): any => {
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
            queue: state.queue.map((req) => req.tenantId === tenantId && req.userId === userId
              ? { ...req, payload: replaceIdRecursively(req.payload) as Record<string, unknown> }
              : req),
          }
        }),
    }),
    { 
      name: "offline-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)

/** Purge an exact queue identity. Unscoped legacy records are retained because ownership is unknowable. */
export async function purgeOfflineQueueForIdentity(tenantId: string, userId: string): Promise<void> {
  await useOfflineStore.persist.rehydrate()
  const isDepartingIdentity = (request: QueuedRequest) => request.tenantId === tenantId && request.userId === userId
  const departingRequests = useOfflineStore.getState().queue.filter(isDepartingIdentity)
  const retainedQueue = useOfflineStore.getState().queue.filter((request) => !isDepartingIdentity(request))
  const binaryIds = new Set(departingRequests.flatMap((request) => request.binaryRefs?.map((ref) => ref.id) ?? []))

  await Promise.all([...binaryIds].map((id) => offlineBinaryStorage.removeBinary(id)))
  await indexedDBStorage.setItem("offline-storage", JSON.stringify({ state: { queue: retainedQueue }, version: 0 }))
  useOfflineStore.setState({ queue: retainedQueue })
}

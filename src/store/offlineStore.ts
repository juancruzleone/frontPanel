import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { type OfflineIdentityScope, buildScopeKey, getOrCreateDeviceId } from "../shared/offline/types"

export interface QueuedRequest {
  id: string
  userId?: string | null
  /** Owner scope — binds this request to a specific tenant + user + device. */
  ownerScope?: OfflineIdentityScope
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
  quarantined?: boolean
  quarantineReason?: string
}

interface OfflineState {
  queue: QueuedRequest[]
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => void
  removeFromQueue: (id: string) => void
  updateRequest: (id: string, data: Partial<QueuedRequest>) => void
  remapPayloadId: (oldId: string, newId: string) => void
  clearQueue: () => void
  /** Remove only queue items belonging to a specific scope. */
  clearQueueForScope: (scope: OfflineIdentityScope) => void
}

/** Read the current auth identity and build a scope. Returns null if not authenticated. */
function getCurrentScope(): OfflineIdentityScope | null {
  try {
    const authState = window.localStorage.getItem('auth-storage')
    if (!authState) return null
    const parsed = JSON.parse(authState)
    const state = parsed.state
    if (!state?.userId || !state?.tenantId) return null
    return {
      tenantId: state.tenantId,
      userId: state.userId,
      deviceId: getOrCreateDeviceId(),
    }
  } catch {
    return null
  }
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queue: [],
      addToQueue: (request) => {
        const scope = getCurrentScope()
        return set((state) => ({
          queue: [
            ...state.queue,
            {
              ...request,
              id: crypto.randomUUID(),
              userId: scope?.userId ?? null,
              ownerScope: scope ?? undefined,
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
      clearQueueForScope: (scope) => {
        const scopeKey = buildScopeKey(scope)
        set((state) => ({
          queue: state.queue.filter((req) => {
            if (!req.ownerScope) return true // Keep legacy unscoped items
            return buildScopeKey(req.ownerScope) !== scopeKey
          }),
        }))
      },
    }),
    { 
      name: "offline-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import {
  type OfflineIdentityScope, buildScopeKey, getOrCreateDeviceId,
  type SyncItemStatus, type SyncErrorCategory, type DeadLetterRecord,
  type SyncReceipt, type BackoffState,
  BACKOFF_BASE_MS, BACKOFF_MAX_MS, DEAD_LETTER_MAX_ATTEMPTS,
  calculateBackoffDelay,
} from "../shared/offline/types"

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
  /** R9: sync status for OfflineSyncCenter display. */
  syncStatus?: SyncItemStatus
  /** R9: error category drives recovery actions. */
  errorCategory?: SyncErrorCategory
  /** R9: bounded backoff state. */
  backoff?: BackoffState
  /** R9: authoritative server receipt (never local). */
  receipt?: SyncReceipt | null
}

interface OfflineState {
  queue: QueuedRequest[]
  /** R9: dead-letter records — inspectable but never replayed. */
  deadLetters: DeadLetterRecord[]
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => void
  removeFromQueue: (id: string) => void
  updateRequest: (id: string, data: Partial<QueuedRequest>) => void
  remapPayloadId: (oldId: string, newId: string) => void
  clearQueue: () => void
  /** Remove only queue items belonging to a specific scope. */
  clearQueueForScope: (scope: OfflineIdentityScope) => void
  /** R9: move a queue item to dead letters. */
  moveToDeadLetter: (id: string, errorCategory: SyncErrorCategory, errorMessage: string) => void
  /** R9: discard a dead letter (inspectable removal). */
  discardDeadLetter: (id: string) => void
  /** R9: clear dead letters for a scope. */
  clearDeadLettersForScope: (scopeKey: string) => void
  /** R9: classify error and update item status. */
  classifyError: (id: string, error: unknown) => SyncErrorCategory
  /** R9: schedule next retry with backoff. */
  scheduleRetry: (id: string) => void
  /** R9: check if item should be dead-lettered. */
  shouldDeadLetter: (id: string) => boolean
}

/** Classify an error into a sync error category. */
export function classifySyncError(error: unknown): SyncErrorCategory {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    const status = (error as any).status
    if (status === 401 || status === 403 || msg.includes('session') || msg.includes('expired')) return 'auth'
    if (status === 409 || msg.includes('conflict') || msg.includes('stale')) return 'conflict'
    if (status && status >= 400 && status < 500) return 'permanent'
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) return 'network'
  }
  // Default: treat unknown errors as network (retryable)
  return 'network'
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
    (set, get) => ({
      queue: [],
      deadLetters: [],
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
              retries: 0,
              syncStatus: 'pending' as SyncItemStatus,
              backoff: { attempt: 0, nextRetryAt: 0, baseDelayMs: BACKOFF_BASE_MS, maxDelayMs: BACKOFF_MAX_MS },
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
      // R9: Dead-letter management
      moveToDeadLetter: (id, errorCategory, errorMessage) => {
        const state = get()
        const item = state.queue.find((req) => req.id === id)
        if (!item) return
        const scopeKey = item.ownerScope ? buildScopeKey(item.ownerScope) : 'unknown'
        const deadLetter: DeadLetterRecord = {
          id: crypto.randomUUID(),
          originalId: item.id,
          type: item.type,
          payload: item.payload,
          errorCategory,
          errorMessage,
          failedAt: Date.now(),
          retryCount: item.retries ?? 0,
          scopeKey,
          receipt: item.receipt ?? null,
        }
        set((state) => ({
          queue: state.queue.filter((req) => req.id !== id),
          deadLetters: [...state.deadLetters, deadLetter],
        }))
      },
      discardDeadLetter: (id) =>
        set((state) => ({
          deadLetters: state.deadLetters.filter((dl) => dl.id !== id),
        })),
      clearDeadLettersForScope: (scopeKey) =>
        set((state) => ({
          deadLetters: state.deadLetters.filter((dl) => dl.scopeKey !== scopeKey),
        })),
      classifyError: (id, error) => {
        const category = classifySyncError(error)
        const status: SyncItemStatus = category === 'auth' ? 'conflict' : category === 'permanent' ? 'permanent' : 'pending'
        set((state) => ({
          queue: state.queue.map((req) => req.id === id ? { ...req, errorCategory: category, syncStatus: status } : req),
        }))
        return category
      },
      scheduleRetry: (id) => {
        set((state) => ({
          queue: state.queue.map((req) => {
            if (req.id !== id) return req
            const attempt = (req.backoff?.attempt ?? 0) + 1
            const delay = calculateBackoffDelay(attempt)
            return {
              ...req,
              retries: (req.retries ?? 0) + 1,
              backoff: { attempt, nextRetryAt: Date.now() + delay, baseDelayMs: BACKOFF_BASE_MS, maxDelayMs: BACKOFF_MAX_MS },
              syncStatus: 'pending' as SyncItemStatus,
            }
          }),
        }))
      },
      shouldDeadLetter: (id) => {
        const item = get().queue.find((req) => req.id === id)
        if (!item) return false
        return (item.retries ?? 0) >= DEAD_LETTER_MAX_ATTEMPTS
      },
    }),
    { 
      name: "offline-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)

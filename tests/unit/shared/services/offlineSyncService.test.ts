
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { offlineSyncService } from "../../../../src/shared/services/offlineSyncService"
import { useOfflineStore, classifySyncError } from "../../../../src/store/offlineStore"
import {
  calculateBackoffDelay, BACKOFF_BASE_MS, BACKOFF_MAX_MS, BACKOFF_MAX_ATTEMPTS,
  type DeadLetterRecord, type SyncReceipt,
} from "../../../../src/shared/offline/types"
import { refreshSession } from "../../../../src/shared/services/authRefreshService"
import * as workOrderServices from "../../../../src/features/workOrders/services/workOrderServices"
import * as deviceFormServices from "../../../../src/features/deviceForms/services/deviceFormService"
import { offlineBinaryStorage } from "../../../../src/shared/services/offlineBinaryStorage"
import * as uploadService from "../../../../src/shared/services/uploadService"

vi.mock("../../../../src/features/workOrders/services/workOrderServices")
vi.mock("../../../../src/features/deviceForms/services/deviceFormService")
vi.mock("../../../../src/shared/services/offlineBinaryStorage")
vi.mock("../../../../src/shared/services/uploadService")
vi.mock("../../../../src/shared/services/authRefreshService")

// Mock IndexedDB storage for Zustand
vi.mock("../../../../src/utils/indexedDBStorage", () => ({
  indexedDBStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  }
}))

describe("OfflineSyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useOfflineStore.getState().clearQueue()
    vi.stubGlobal('navigator', { onLine: true })
    // Provide authenticated context so addToQueue stamps ownerScope
    // and syncOfflineStore can match items to the current scope.
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { userId: 'test-user', tenantId: 'test-tenant' },
    }))
  })

  it("should pause syncing and not remove from queue on 401/403 session expired", async () => {
    // GIVEN two queued items
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    })
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    })

    const queue = useOfflineStore.getState().queue
    expect(queue).toHaveLength(2)

    // AND the first service call fails with 403 (Session Expired)
    // We simulate the error structure that fetch/services usually throw
    const sessionError = new Error("Session expired")
    Object.assign(sessionError, { status: 403 })

    vi.mocked(workOrderServices.createWorkOrder).mockRejectedValueOnce(sessionError)

    // WHEN syncing
    await offlineSyncService.syncAll()

    // THEN the first item should still be in the queue (non-destructive)
    // AND the second item should NOT have been processed (paused)
    expect(useOfflineStore.getState().queue).toHaveLength(2)
    expect(workOrderServices.createWorkOrder).toHaveBeenCalledTimes(1)
    expect(useOfflineStore.getState().queue[0].lastError).toBe("Session expired")
  })

  it("should retry on non-auth errors and continue loop if online", async () => {
     // GIVEN two queued items
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    })
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    })

    // AND the first fails with a generic error
    vi.mocked(workOrderServices.createWorkOrder)
      .mockRejectedValueOnce(new Error("Generic Error"))
      .mockResolvedValueOnce({ _id: "wo-2" } as any)

    // WHEN syncing
    await offlineSyncService.syncAll()

    // THEN the first item stays in queue with error
    // AND the second item is removed (success)
    expect(useOfflineStore.getState().queue).toHaveLength(1)
    expect(useOfflineStore.getState().queue[0].payload).toEqual({ title: "Test WO 1" })
    expect(useOfflineStore.getState().queue[0].lastError).toBe("Generic Error")
    expect(workOrderServices.createWorkOrder).toHaveBeenCalledTimes(2)
  })

  it("should continue syncing if a 403 is transient (handled by service retry)", async () => {
    // GIVEN two queued items
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    })
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    })

    // AND the first item succeeds (simulating that any CSRF 403 was already handled/retried by the service)
    vi.mocked(workOrderServices.createWorkOrder)
      .mockResolvedValueOnce({ _id: "wo-1" } as any)
      .mockResolvedValueOnce({ _id: "wo-2" } as any)

    // WHEN syncing
    await offlineSyncService.syncAll()

    // THEN both items should be removed from the queue
    expect(useOfflineStore.getState().queue).toHaveLength(0)
    expect(workOrderServices.createWorkOrder).toHaveBeenCalledTimes(2)
  })

  describe("Binary Syncing", () => {
    const mockBlob = new Blob(["test"], { type: "image/png" })
    const mockRef = { id: "bin-1", field: "fotosEvidencia[0]", filename: "test.png", contentType: "image/png", size: 4 }

    it("should upload binary and replace ref with URL before mutation", async () => {
      // GIVEN a maintenance request with binary ref
      useOfflineStore.getState().addToQueue({
        type: 'DEVICE_MAINTENANCE',
        payload: { check1: true },
        binaryRefs: [mockRef],
        metadata: { installationId: "inst-1", deviceId: "dev-1" }
      })

      vi.mocked(offlineBinaryStorage.getBinary).mockResolvedValue(mockBlob)
      vi.mocked(uploadService.uploadBinary).mockResolvedValue("https://cdn.com/test.png")
      vi.mocked(deviceFormServices.submitDeviceMaintenance).mockResolvedValue({ success: true } as any)

      // WHEN syncing
      await offlineSyncService.syncAll()

      // THEN binary is uploaded first
      expect(uploadService.uploadBinary).toHaveBeenCalledWith(mockBlob, "test.png", "bin-1")

      // AND mutation is called with the remote URL in payload
      expect(deviceFormServices.submitDeviceMaintenance).toHaveBeenCalledWith(
        "inst-1",
        "dev-1",
        expect.objectContaining({
          fotosEvidencia: ["https://cdn.com/test.png"],
          check1: true
        })
      )

      // AND binary is cleaned up from storage
      expect(offlineBinaryStorage.removeBinary).toHaveBeenCalledWith("bin-1")

      // AND item is removed from queue
      expect(useOfflineStore.getState().queue).toHaveLength(0)
    })

    it("should halt sync and retain binary if upload fails", async () => {
      // GIVEN a maintenance request with binary ref
      useOfflineStore.getState().addToQueue({
        type: 'DEVICE_MAINTENANCE',
        payload: { check1: true },
        binaryRefs: [mockRef],
        metadata: { installationId: "inst-1", deviceId: "dev-1" }
      })

      vi.mocked(offlineBinaryStorage.getBinary).mockResolvedValue(mockBlob)
      vi.mocked(uploadService.uploadBinary).mockRejectedValue(new Error("Upload Failed"))

      // WHEN syncing
      await offlineSyncService.syncAll()

      // THEN upload was attempted
      expect(uploadService.uploadBinary).toHaveBeenCalled()

      // AND mutation was NOT called
      expect(deviceFormServices.submitDeviceMaintenance).not.toHaveBeenCalled()

      // AND binary was NOT removed from storage
      expect(offlineBinaryStorage.removeBinary).not.toHaveBeenCalled()

      // AND item is still in queue for retry
      expect(useOfflineStore.getState().queue).toHaveLength(1)
      expect(useOfflineStore.getState().queue[0].lastError).toContain("Upload Failed")
    })
  })

  it("should refresh session before syncing when online", async () => {
    // GIVEN we are online and have items in queue
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    })

    vi.mocked(refreshSession).mockResolvedValue({ success: true, authenticated: true })
    vi.mocked(workOrderServices.createWorkOrder).mockResolvedValue({ _id: "wo-1" } as any)

    // WHEN syncing
    await offlineSyncService.syncAll()

    // THEN refreshSession should have been called
    expect(refreshSession).toHaveBeenCalled()
    // AND then the sync should continue
    expect(workOrderServices.createWorkOrder).toHaveBeenCalled()
    expect(useOfflineStore.getState().queue).toHaveLength(0)
  })

  it("should pause sync and emit SESSION_INVALIDATED if refreshSession fails", async () => {
    // GIVEN we are online and have items in queue
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    })

    vi.mocked(refreshSession).mockRejectedValue(new Error("TOKEN_EXPIRED"))

    // Mock postMessage
    const postMessageMock = vi.fn()
    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        controller: {
          postMessage: postMessageMock
        }
      }
    })

    // WHEN syncing
    await offlineSyncService.syncAll()

    // THEN refreshSession was called
    expect(refreshSession).toHaveBeenCalled()
    // AND sync was paused
    expect(workOrderServices.createWorkOrder).not.toHaveBeenCalled()
    expect(useOfflineStore.getState().queue).toHaveLength(1)
    // AND SESSION_INVALIDATED was emitted to service worker
    expect(postMessageMock).toHaveBeenCalledWith({ type: "SESSION_INVALIDATED" })
  })
})

// ── R9: Recovery center — store behavior, backoff, dead letters ─────────

describe("R9: Recovery center", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useOfflineStore.getState().clearQueue()
    useOfflineStore.setState({ deadLetters: [] })
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { userId: 'test-user', tenantId: 'test-tenant' },
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function addTestItem(overrides?: Record<string, unknown>) {
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO" },
      ...overrides,
    })
    return useOfflineStore.getState().queue[useOfflineStore.getState().queue.length - 1]
  }

  // ── Backoff ──────────────────────────────────────────────────────────

  describe("Backoff determinism", () => {
    it("should calculate deterministic delay for attempt 0 with seed", () => {
      const delay = calculateBackoffDelay(0, 42)
      expect(delay).toBeGreaterThan(0)
      expect(delay).toBeLessThanOrEqual(BACKOFF_BASE_MS)
    })

    it("should double base delay per attempt", () => {
      const d0 = calculateBackoffDelay(0, 10)
      const d1 = calculateBackoffDelay(1, 10)
      const d2 = calculateBackoffDelay(2, 10)
      expect(d1).toBeGreaterThan(d0)
      expect(d2).toBeGreaterThan(d1)
    })

    it("should cap at BACKOFF_MAX_MS", () => {
      expect(calculateBackoffDelay(100, 10)).toBeLessThanOrEqual(BACKOFF_MAX_MS)
    })

    it("should return 0 when max attempts exceeded", () => {
      expect(calculateBackoffDelay(BACKOFF_MAX_ATTEMPTS, 10)).toBe(0)
    })

    it("should apply jitter within 25-75% of exponential", () => {
      const exp = BACKOFF_BASE_MS * Math.pow(2, 0) // 1000
      const delay = calculateBackoffDelay(0, 10) // seed 10 → 0.35
      expect(delay).toBe(Math.floor(exp * 0.35))
    })

    it("should schedule retry with backoff in store", () => {
      const item = addTestItem()
      useOfflineStore.getState().scheduleRetry(item.id)
      const updated = useOfflineStore.getState().queue.find(q => q.id === item.id)
      expect(updated?.backoff?.attempt).toBe(1)
      expect(updated?.backoff?.nextRetryAt).toBeGreaterThan(Date.now())
      expect(updated?.retries).toBe(1)
      expect(updated?.syncStatus).toBe('pending')
    })

    it("should increment attempt on each scheduleRetry call", () => {
      const item = addTestItem()
      useOfflineStore.getState().scheduleRetry(item.id)
      useOfflineStore.getState().scheduleRetry(item.id)
      const updated = useOfflineStore.getState().queue.find(q => q.id === item.id)
      expect(updated?.backoff?.attempt).toBe(2)
      expect(updated?.retries).toBe(2)
    })
  })

  // ── Dead letters ─────────────────────────────────────────────────────

  describe("Dead letters", () => {
    it("should move item to dead letters with correct fields", () => {
      const item = addTestItem()
      useOfflineStore.getState().moveToDeadLetter(item.id, 'permanent', 'Max retries')
      expect(useOfflineStore.getState().queue).toHaveLength(0)
      expect(useOfflineStore.getState().deadLetters).toHaveLength(1)
      const dl = useOfflineStore.getState().deadLetters[0]
      expect(dl.originalId).toBe(item.id)
      expect(dl.errorCategory).toBe('permanent')
      expect(dl.errorMessage).toBe('Max retries')
      expect(dl.type).toBe('CREATE_WORK_ORDER')
      expect(dl.failedAt).toBeGreaterThan(0)
    })

    it("should allow discarding dead letters", () => {
      const item = addTestItem()
      useOfflineStore.getState().moveToDeadLetter(item.id, 'network', 'Timeout')
      expect(useOfflineStore.getState().deadLetters).toHaveLength(1)
      useOfflineStore.getState().discardDeadLetter(useOfflineStore.getState().deadLetters[0].id)
      expect(useOfflineStore.getState().deadLetters).toHaveLength(0)
    })

    it("should clear dead letters for a scope", () => {
      const item = addTestItem()
      useOfflineStore.getState().moveToDeadLetter(item.id, 'network', 'Timeout')
      const scopeKey = useOfflineStore.getState().deadLetters[0].scopeKey
      useOfflineStore.getState().clearDeadLettersForScope(scopeKey)
      expect(useOfflineStore.getState().deadLetters).toHaveLength(0)
    })

    it("should preserve payload in dead letter", () => {
      addTestItem({ type: 'CREATE_WORK_ORDER', payload: { title: "Important WO" } })
      const item = useOfflineStore.getState().queue[0]
      useOfflineStore.getState().moveToDeadLetter(item.id, 'conflict', 'Stale')
      expect(useOfflineStore.getState().deadLetters[0].payload).toEqual({ title: "Important WO" })
    })

    it("should handle multiple dead letters independently", () => {
      addTestItem({ type: 'CREATE_WORK_ORDER', payload: { title: "WO-1" } })
      addTestItem({ type: 'UPDATE_WORK_ORDER', payload: { title: "WO-2" } })
      const [item1, item2] = useOfflineStore.getState().queue
      useOfflineStore.getState().moveToDeadLetter(item1.id, 'network', 'Timeout')
      useOfflineStore.getState().moveToDeadLetter(item2.id, 'conflict', 'Stale')
      expect(useOfflineStore.getState().deadLetters).toHaveLength(2)
      useOfflineStore.getState().discardDeadLetter(useOfflineStore.getState().deadLetters[0].id)
      expect(useOfflineStore.getState().deadLetters).toHaveLength(1)
    })
  })

  // ── Error classification ─────────────────────────────────────────────

  describe("Error classification", () => {
    it("should classify auth errors (401)", () => {
      const e = new Error("Unauthorized"); Object.assign(e, { status: 401 })
      expect(classifySyncError(e)).toBe('auth')
    })

    it("should classify auth errors (403)", () => {
      const e = new Error("Forbidden"); Object.assign(e, { status: 403 })
      expect(classifySyncError(e)).toBe('auth')
    })

    it("should classify session-related errors as auth", () => {
      expect(classifySyncError(new Error("Session expired"))).toBe('auth')
    })

    it("should classify conflict errors (409)", () => {
      const e = new Error("Conflict"); Object.assign(e, { status: 409 })
      expect(classifySyncError(e)).toBe('conflict')
    })

    it("should classify permanent errors (400)", () => {
      const e = new Error("Bad request"); Object.assign(e, { status: 400 })
      expect(classifySyncError(e)).toBe('permanent')
    })

    it("should classify permanent errors (404)", () => {
      const e = new Error("Not found"); Object.assign(e, { status: 404 })
      expect(classifySyncError(e)).toBe('permanent')
    })

    it("should classify network errors", () => {
      expect(classifySyncError(new Error("Failed to fetch"))).toBe('network')
    })

    it("should classify unknown errors as network (retryable)", () => {
      expect(classifySyncError("unknown")).toBe('network')
      expect(classifySyncError(null)).toBe('network')
    })

    it("should classify error and update item in store", () => {
      const item = addTestItem()
      const error = new Error("Unauthorized"); Object.assign(error, { status: 401 })
      const category = useOfflineStore.getState().classifyError(item.id, error)
      expect(category).toBe('auth')
      const updated = useOfflineStore.getState().queue.find(q => q.id === item.id)
      expect(updated?.errorCategory).toBe('auth')
      expect(updated?.syncStatus).toBe('conflict')
    })

    it("should set syncStatus to pending for network errors", () => {
      const item = addTestItem()
      useOfflineStore.getState().classifyError(item.id, new Error("Network"))
      const updated = useOfflineStore.getState().queue.find(q => q.id === item.id)
      expect(updated?.errorCategory).toBe('network')
      expect(updated?.syncStatus).toBe('pending')
    })

    it("should set syncStatus to permanent for 4xx errors", () => {
      const item = addTestItem()
      const e = new Error("Bad request"); Object.assign(e, { status: 400 })
      useOfflineStore.getState().classifyError(item.id, e)
      const updated = useOfflineStore.getState().queue.find(q => q.id === item.id)
      expect(updated?.errorCategory).toBe('permanent')
      expect(updated?.syncStatus).toBe('permanent')
    })
  })

  // ── Queue item lifecycle ─────────────────────────────────────────────

  describe("Queue item lifecycle", () => {
    it("should set initial syncStatus to pending on addToQueue", () => {
      addTestItem()
      expect(useOfflineStore.getState().queue[0].syncStatus).toBe('pending')
    })

    it("should set initial backoff state on addToQueue", () => {
      addTestItem()
      const item = useOfflineStore.getState().queue[0]
      expect(item.backoff?.attempt).toBe(0)
      expect(item.backoff?.baseDelayMs).toBe(BACKOFF_BASE_MS)
      expect(item.backoff?.maxDelayMs).toBe(BACKOFF_MAX_MS)
    })

    it("should update syncStatus via updateRequest", () => {
      const item = addTestItem()
      useOfflineStore.getState().updateRequest(item.id, { syncStatus: 'processing' })
      expect(useOfflineStore.getState().queue[0].syncStatus).toBe('processing')
    })

    it("should update receipt via updateRequest", () => {
      const item = addTestItem()
      const receipt: SyncReceipt = { commandId: 'cmd-1', status: 'accepted', serverTimestamp: new Date().toISOString() }
      useOfflineStore.getState().updateRequest(item.id, { receipt })
      expect(useOfflineStore.getState().queue[0].receipt?.status).toBe('accepted')
    })
  })

  // ── shouldDeadLetter ─────────────────────────────────────────────────

  describe("shouldDeadLetter", () => {
    it("should return true when retries at max", () => {
      const item = addTestItem()
      useOfflineStore.getState().updateRequest(item.id, { retries: BACKOFF_MAX_ATTEMPTS })
      expect(useOfflineStore.getState().shouldDeadLetter(item.id)).toBe(true)
    })

    it("should return false when retries below max", () => {
      const item = addTestItem()
      useOfflineStore.getState().updateRequest(item.id, { retries: 3 })
      expect(useOfflineStore.getState().shouldDeadLetter(item.id)).toBe(false)
    })

    it("should return false for unknown item", () => {
      expect(useOfflineStore.getState().shouldDeadLetter('nonexistent')).toBe(false)
    })
  })

  // ── SyncStatus transitions (syncAll integration) ─────────────────────

  describe("SyncAll integration", () => {
    it("should mark items as conflict when lease is expired", async () => {
      // Setup expired lease
      localStorage.setItem('offline-trust-storage', JSON.stringify({
        state: { claim: { expiresAt: new Date(Date.now() - 1000).toISOString() } },
      }))
      addTestItem()

      // Reset mocks for this test
      vi.clearAllMocks()
      vi.mocked(refreshSession).mockResolvedValue({ success: true, authenticated: true } as any)
      vi.stubGlobal('navigator', { onLine: true, serviceWorker: undefined })

      await offlineSyncService.syncAll()

      const item = useOfflineStore.getState().queue[0]
      expect(item.syncStatus).toBe('conflict')
      expect(item.errorCategory).toBe('auth')
      expect(item.lastError).toContain('expired')
    })

    it("should process items when lease is valid", async () => {
      localStorage.setItem('offline-trust-storage', JSON.stringify({
        state: { claim: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } },
      }))
      addTestItem()

      vi.clearAllMocks()
      vi.mocked(refreshSession).mockResolvedValue({ success: true, authenticated: true } as any)
      vi.mocked(workOrderServices.createWorkOrder).mockResolvedValue({ _id: "wo-1" } as any)
      vi.stubGlobal('navigator', { onLine: true, serviceWorker: undefined })

      await offlineSyncService.syncAll()

      expect(useOfflineStore.getState().queue).toHaveLength(0)
    })

    it("should not process dead-lettered items", async () => {
      addTestItem()
      const item = useOfflineStore.getState().queue[0]
      useOfflineStore.getState().moveToDeadLetter(item.id, 'permanent', 'Failed')

      vi.clearAllMocks()
      vi.mocked(refreshSession).mockResolvedValue({ success: true, authenticated: true } as any)
      vi.stubGlobal('navigator', { onLine: true, serviceWorker: undefined })

      await offlineSyncService.syncAll()

      expect(workOrderServices.createWorkOrder).not.toHaveBeenCalled()
      expect(useOfflineStore.getState().deadLetters).toHaveLength(1)
    })
  })
})

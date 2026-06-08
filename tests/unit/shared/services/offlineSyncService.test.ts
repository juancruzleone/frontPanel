
import { describe, it, expect, vi, beforeEach } from "vitest"
import { offlineSyncService } from "../../../../src/shared/services/offlineSyncService"
import { useOfflineStore } from "../../../../src/store/offlineStore"
import * as workOrderServices from "../../../../src/features/workOrders/services/workOrderServices"

vi.mock("../../../../src/features/workOrders/services/workOrderServices")

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
    // @ts-ignore
    sessionError.status = 403
    
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
})

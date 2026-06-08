
import { describe, it, expect, vi, beforeEach } from "vitest"
import { offlineSyncService } from "../../../../src/shared/services/offlineSyncService"
import { useOfflineStore } from "../../../../src/store/offlineStore"
import * as workOrderServices from "../../../../src/features/workOrders/services/workOrderServices"
import * as deviceFormServices from "../../../../src/features/deviceForms/services/deviceFormService"
import { offlineBinaryStorage } from "../../../../src/shared/services/offlineBinaryStorage"
import * as uploadService from "../../../../src/shared/services/uploadService"

vi.mock("../../../../src/features/workOrders/services/workOrderServices")
vi.mock("../../../../src/features/deviceForms/services/deviceFormService")
vi.mock("../../../../src/shared/services/offlineBinaryStorage")
vi.mock("../../../../src/shared/services/uploadService")

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
      expect(uploadService.uploadBinary).toHaveBeenCalledWith(mockBlob, "test.png")
      
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
})

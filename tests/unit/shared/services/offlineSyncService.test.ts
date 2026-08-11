
import { describe, it, expect, vi, beforeEach } from "vitest"
import { offlineSyncService } from "../../../../src/shared/services/offlineSyncService"
import { useOfflineStore } from "../../../../src/store/offlineStore"
import { useAuthStore } from "../../../../src/store/authStore"
import { refreshSession } from "../../../../src/shared/services/authRefreshService"
import * as workOrderServices from "../../../../src/features/workOrders/services/workOrderServices"
import * as deviceFormServices from "../../../../src/features/deviceForms/services/deviceFormService"
import { offlineBinaryStorage } from "../../../../src/shared/services/offlineBinaryStorage"
import * as uploadService from "../../../../src/shared/services/uploadService"
import * as installationServices from "../../../../src/features/installations/services/installationServices"

vi.mock("../../../../src/features/workOrders/services/workOrderServices")
vi.mock("../../../../src/features/deviceForms/services/deviceFormService")
vi.mock("../../../../src/shared/services/offlineBinaryStorage")
vi.mock("../../../../src/shared/services/uploadService")
vi.mock("../../../../src/shared/services/authRefreshService")
vi.mock("../../../../src/features/installations/services/installationServices")

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
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: true, userId: "current-user" })
    vi.stubGlobal('navigator', { onLine: true })
    vi.mocked(refreshSession).mockResolvedValue({ success: true, authenticated: true })
  })

  it("does not refresh or sync an empty queue", async () => {
    await offlineSyncService.syncAll()

    expect(refreshSession).not.toHaveBeenCalled()
    expect(workOrderServices.createWorkOrder).not.toHaveBeenCalled()
  })

  it("does not refresh before current authentication is resolved", async () => {
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: false })
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO" },
    }, "current-user")

    await offlineSyncService.syncAll()

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it("should pause syncing and not remove from queue on 401/403 session expired", async () => {
    // GIVEN two queued items
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 1" },
    }, "current-user")
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    }, "current-user")
    
    const queue = useOfflineStore.getState().queue
    expect(queue).toHaveLength(2)

    // AND the first service call fails with 403 (Session Expired)
    // We simulate the error structure that fetch/services usually throw
    const sessionError = new Error("Session expired")
    Object.assign(sessionError, { status: 403, code: 'UNAUTHENTICATED' })
    
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
    }, "current-user")
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    }, "current-user")

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
    }, "current-user")
    useOfflineStore.getState().addToQueue({
      type: 'CREATE_WORK_ORDER' as any,
      payload: { title: "Test WO 2" },
    }, "current-user")

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
      }, "current-user")

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
      }, "current-user")

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
    }, "current-user")
    
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
    }, "current-user")
    
    vi.mocked(refreshSession).mockRejectedValue(Object.assign(new Error("Session expired"), {
      code: 'REFRESH_TOKEN_EXPIRED',
      status: 401,
    }))
    
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

  it("processes only the current owner's operation and preserves another owner's operation", async () => {
    useOfflineStore.setState({
      queue: [
        {
          id: "other-operation",
          userId: "other-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-other", data: { company: "Other" } },
          timestamp: 1,
        },
        {
          id: "current-operation",
          userId: "current-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-current", data: { company: "Current" } },
          timestamp: 2,
        },
      ],
    })
    vi.mocked(installationServices.updateInstallation).mockResolvedValue({
      company: "Current",
      address: "Address",
      installationType: "Type",
    })

    await offlineSyncService.syncAll()

    expect(installationServices.updateInstallation).toHaveBeenCalledTimes(1)
    expect(installationServices.updateInstallation).toHaveBeenCalledWith(
      "inst-current",
      { company: "Current" },
    )
    expect(useOfflineStore.getState().queue).toEqual([
      expect.objectContaining({ id: "other-operation", userId: "other-user" }),
    ])
  })

  it.each([
    ["logout", null],
    ["account switch", "other-user"],
  ])("preserves queued work when identity changes during processing: %s", async (_scenario, nextUserId) => {
    useOfflineStore.setState({
      queue: [
        {
          id: "processing-operation",
          userId: "current-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-current", data: { company: "Current" } },
          timestamp: 1,
        },
        {
          id: "remaining-operation",
          userId: "current-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-next", data: { company: "Next" } },
          timestamp: 2,
        },
      ],
    })
    let resolveUpdate: (value: { company: string; address: string; installationType: string }) => void = () => undefined
    vi.mocked(installationServices.updateInstallation).mockImplementationOnce(() => new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    const syncPromise = offlineSyncService.syncAll()
    await vi.waitFor(() => expect(installationServices.updateInstallation).toHaveBeenCalledTimes(1))
    useAuthStore.setState({ userId: nextUserId })
    resolveUpdate({ company: "Current", address: "Address", installationType: "Type" })
    await syncPromise

    expect(installationServices.updateInstallation).toHaveBeenCalledTimes(1)
    expect(useOfflineStore.getState().queue.map((item) => item.id)).toEqual([
      "processing-operation",
      "remaining-operation",
    ])
  })

  it("preserves queued work when authentication expires but persisted userId remains", async () => {
    useOfflineStore.setState({
      queue: [
        {
          id: "processing-operation",
          userId: "current-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-current", data: { company: "Current" } },
          timestamp: 1,
        },
        {
          id: "remaining-operation",
          userId: "current-user",
          type: "UPDATE_INSTALLATION",
          payload: { id: "inst-next", data: { company: "Next" } },
          timestamp: 2,
        },
      ],
    })
    let resolveUpdate: (value: { company: string; address: string; installationType: string }) => void = () => undefined
    vi.mocked(installationServices.updateInstallation).mockImplementationOnce(() => new Promise((resolve) => {
      resolveUpdate = resolve
    }))

    const syncPromise = offlineSyncService.syncAll()
    await vi.waitFor(() => expect(installationServices.updateInstallation).toHaveBeenCalledTimes(1))
    useAuthStore.setState({ userId: "current-user", isAuthenticated: false })
    resolveUpdate({ company: "Current", address: "Address", installationType: "Type" })
    await syncPromise

    expect(installationServices.updateInstallation).toHaveBeenCalledTimes(1)
    expect(useOfflineStore.getState().queue.map((item) => item.id)).toEqual([
      "processing-operation",
      "remaining-operation",
    ])
  })

  it("pauses safely without mutating the queue when the current owner is unavailable", async () => {
    useAuthStore.setState({ userId: null })
    useOfflineStore.setState({
      queue: [{
        id: "orphan-operation",
        userId: "current-user",
        type: "UPDATE_INSTALLATION",
        payload: { id: "inst-current", data: { company: "Current" } },
        timestamp: 1,
      }],
    })

    await offlineSyncService.syncAll()

    expect(installationServices.updateInstallation).not.toHaveBeenCalled()
    expect(useOfflineStore.getState().queue).toHaveLength(1)
    expect(useOfflineStore.getState().queue[0]).toMatchObject({ id: "orphan-operation" })
    expect(useOfflineStore.getState().queue[0]).not.toHaveProperty("retries")
    expect(useOfflineStore.getState().queue[0]).not.toHaveProperty("lastError")
  })
})

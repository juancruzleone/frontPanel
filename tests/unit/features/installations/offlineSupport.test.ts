
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import useInstallations from "../../../../src/features/installations/hooks/useInstallations"
import * as installationServices from "../../../../src/features/installations/services/installationServices"
import { useInstallationStore } from "../../../../src/store/installationStore"

// Mock the services
vi.mock("../../../../src/features/installations/services/installationServices")
vi.mock("../../../../src/store/offlineStore", () => {
  const addToQueue = vi.fn();
  const mockStore = vi.fn(() => ({
    addToQueue
  })) as any;
  mockStore.getState = vi.fn(() => ({
    addToQueue
  }));
  mockStore.addToQueue = addToQueue;
  return { useOfflineStore: mockStore };
})
vi.mock("../../../../src/store/authStore", () => {
  const store = vi.fn(() => ({
    token: "fake-token",
    isAuthenticated: true,
    userId: "test-user-id",
  })) as any
  store.getState = () => ({
    token: "fake-token",
    isAuthenticated: true,
    userId: "test-user-id",
  })
  return { useAuthStore: store }
})

describe("useInstallations Offline Support", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useInstallationStore.getState().setInstallations([])
    vi.stubGlobal('navigator', { onLine: true })
  })

  it("should use cached installations when offline", async () => {
    // 1. Pre-fill the store (simulating a previous successful load)
    const mockInstallations = [{ _id: "1", company: "Test Co", address: "123 St", installationType: "Type A" } as any]
    useInstallationStore.getState().setOwnerId("test-user-id")
    useInstallationStore.getState().setInstallations(mockInstallations)

    // 2. Simulate going offline
    vi.stubGlobal('navigator', { onLine: false })
    
    // 3. Mock fetch to fail
    vi.mocked(installationServices.fetchInstallations).mockRejectedValue(new Error("Network Error"))

    const { result } = renderHook(() => useInstallations())

    // 4. Try to load
    await act(async () => {
      await result.current.loadInstallations()
    })

    // 5. Verify it didn't set an error and kept the cached data
    expect(result.current.error).toBeNull()
    expect(result.current.installations).toEqual(mockInstallations)
  })

  it("should queue addDeviceToInstallation when offline and update UI/store", async () => {
    vi.stubGlobal('navigator', { onLine: false })
    
    // GIVEN an installation in the store
    const mockInst = { _id: "inst-1", company: "Test Co", devices: [] } as any
    useInstallationStore.setState({ installations: [mockInst], ownerId: "test-user-id" })

    const { result } = renderHook(() => useInstallations())
    const { useOfflineStore } = await import("../../../../src/store/offlineStore")
    
    const mockDevice = { assetId: "asset-1", nombre: "Device 1", ubicacion: "Loc", categoria: "Cat", estado: "Ok" }
    
    await act(async () => {
      await result.current.addDeviceToInstallation("inst-1", mockDevice)
    })

    // THEN it should be queued
    expect(useOfflineStore.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ADD_INSTALLATION_DEVICE',
      payload: mockDevice,
      metadata: { installationId: "inst-1" }
    }))

    // AND UI state should be updated optimistically
    expect(result.current.installationDevices).toHaveLength(1)
    expect(result.current.installationDevices[0].nombre).toBe("Device 1")

    // AND store should be updated optimistically
    const updatedInst = useInstallationStore.getState().installations.find(i => i._id === "inst-1")
    expect(updatedInst?.devices).toHaveLength(1)
    expect(updatedInst?.devices?.[0].nombre).toBe("Device 1")
  })

  it("should queue removeDeviceFromInstallation when offline and update UI", async () => {
    vi.stubGlobal('navigator', { onLine: false })
    
    // GIVEN an installation in the store
    const mockInst = { _id: "inst-1", company: "Test Co", devices: [] } as any
    useInstallationStore.setState({ installations: [mockInst], ownerId: "test-user-id" })

    const { result } = renderHook(() => useInstallations())
    const { useOfflineStore } = await import("../../../../src/store/offlineStore")
    
    // GIVEN a device already in state (e.g. added offline previously)
    const mockDevice = { assetId: "asset-1", nombre: "Device 1" } as any
    await act(async () => {
      await result.current.addDeviceToInstallation("inst-1", mockDevice)
    })
    expect(result.current.installationDevices).toHaveLength(1)
    const addedId = result.current.installationDevices[0]._id as string;

    // WHEN removing it offline
    await act(async () => {
      await result.current.removeDeviceFromInstallation("inst-1", addedId)
    })

    // THEN it should be queued
    expect(useOfflineStore.addToQueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'REMOVE_INSTALLATION_DEVICE',
      payload: { installationId: "inst-1", deviceId: addedId },
      metadata: { installationId: "inst-1", deviceId: addedId }
    }))

    // AND UI state should be updated (removed)
    expect(result.current.installationDevices).toHaveLength(0)

    // AND store should be updated optimistically
    const updatedInst = useInstallationStore.getState().installations.find(i => i._id === "inst-1")
    expect(updatedInst?.devices).toHaveLength(0)
  })
})

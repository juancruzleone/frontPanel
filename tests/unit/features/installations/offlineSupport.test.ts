
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import useInstallations from "../../../../src/features/installations/hooks/useInstallations"
import * as installationServices from "../../../../src/features/installations/services/installationServices"
import { useInstallationStore } from "../../../../src/store/installationStore"
import { ApiResponseError } from "../../../../src/shared/utils/errorHelpers"

const authStoreMock = vi.hoisted(() => ({
  userId: "test-user-id" as string | null,
  isAuthenticated: true,
  isAuthResolved: true,
}))

const offlineStoreMock = vi.hoisted(() => {
  const queue: Array<Record<string, unknown>> = []
  const addToQueue = vi.fn((request: Record<string, unknown>) => {
    queue.push({ ...request, id: `queue-${queue.length + 1}`, userId: "test-user-id", timestamp: Date.now() })
  })
  const updateRequest = vi.fn((id: string, data: Record<string, unknown>) => {
    const index = queue.findIndex((request) => request.id === id)
    if (index >= 0) queue[index] = { ...queue[index], ...data }
  })
  const queueInstallationUpdate = vi.fn((ownerId: string, installationId: string, data: Record<string, unknown>) => {
    if (authStoreMock.userId !== ownerId) return false
    const matchingIndexes = queue.reduce<number[]>((indexes, request, index) => {
      const payload = request.payload as { id?: unknown } | undefined
      if (request.type === "UPDATE_INSTALLATION" && request.userId === ownerId && payload?.id === installationId) {
        indexes.push(index)
      }
      return indexes
    }, [])
    const firstMatch = matchingIndexes[0]
    const payload = { id: installationId, data }
    if (firstMatch === undefined) {
      queue.push({ id: `queue-${queue.length + 1}`, userId: ownerId, type: "UPDATE_INSTALLATION", payload, timestamp: Date.now() })
    } else {
      const duplicateIndexes = new Set(matchingIndexes.slice(1))
      const compacted = queue.flatMap((request, index) => {
        if (duplicateIndexes.has(index)) return []
        return [index === firstMatch ? { ...request, payload, retries: 0, lastError: undefined } : request]
      })
      queue.splice(0, queue.length, ...compacted)
    }
    return true
  })

  return { queue, addToQueue, updateRequest, queueInstallationUpdate }
})

// Mock the services
vi.mock("../../../../src/features/installations/services/installationServices")
vi.mock("../../../../src/store/offlineStore", () => {
  const mockStore = vi.fn(() => ({
    addToQueue: offlineStoreMock.addToQueue,
    queueInstallationUpdate: offlineStoreMock.queueInstallationUpdate,
  })) as any;
  mockStore.getState = vi.fn(() => ({
    queue: offlineStoreMock.queue,
    addToQueue: offlineStoreMock.addToQueue,
    updateRequest: offlineStoreMock.updateRequest,
    queueInstallationUpdate: offlineStoreMock.queueInstallationUpdate,
  }));
  mockStore.addToQueue = offlineStoreMock.addToQueue;
  return { useOfflineStore: mockStore };
})
vi.mock("../../../../src/store/authStore", () => {
  const store = vi.fn(() => ({
    token: "fake-token",
    isAuthenticated: authStoreMock.isAuthenticated,
    isAuthResolved: authStoreMock.isAuthResolved,
    userId: authStoreMock.userId,
  })) as any
  store.getState = () => ({
    token: "fake-token",
    isAuthenticated: authStoreMock.isAuthenticated,
    isAuthResolved: authStoreMock.isAuthResolved,
    userId: authStoreMock.userId,
  })
  return { useAuthStore: store }
})

describe("useInstallations Offline Support", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    offlineStoreMock.queue.length = 0
    authStoreMock.userId = "test-user-id"
    authStoreMock.isAuthenticated = true
    authStoreMock.isAuthResolved = true
    useInstallationStore.getState().setInstallations([])
    vi.stubGlobal('navigator', { onLine: true })
    vi.mocked(installationServices.buildInstallationUpdateDto).mockImplementation((installation) => ({
      company: installation.company,
      address: installation.address,
      installationType: installation.installationType,
      floorSector: installation.floorSector,
      postalCode: installation.postalCode,
      city: installation.city,
      province: installation.province,
    }))
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

  const hydratedInstallation = {
    _id: "inst-1",
    company: "Central Plant",
    address: "Main Street 123",
    installationType: "Industrial",
    floorSector: "Floor 2",
    postalCode: "1000",
    city: "Buenos Aires",
    province: "Buenos Aires",
    devices: [{ assetId: "asset-1" }],
    maintenanceHistory: [{ signature: "signature" }],
    photos: ["photo"],
    tenantId: "tenant-1",
    createdBy: "user-1",
    updatedAt: "2026-08-11T00:00:00.000Z",
  }

  const expectedUpdateDto = {
    company: "Central Plant",
    address: "Main Street 123",
    installationType: "Industrial",
    floorSector: "Floor 2",
    postalCode: "1000",
    city: "Buenos Aires",
    province: "Buenos Aires",
  }

  it("queues one compact optimistic update when an online PUT loses connectivity", async () => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    vi.mocked(installationServices.updateInstallation).mockRejectedValue(new Error("ERR_INTERNET_DISCONNECTED"))
    const { result } = renderHook(() => useInstallations())

    await act(async () => {
      await result.current.editInstallation("inst-1", hydratedInstallation)
    })

    expect(offlineStoreMock.queue).toHaveLength(1)
    expect(offlineStoreMock.queue[0].payload).toEqual({
      id: "inst-1",
      data: expectedUpdateDto,
    })
    expect(offlineStoreMock.queue[0]).toMatchObject({
      type: "UPDATE_INSTALLATION",
    })
    expect(useInstallationStore.getState().installations[0]).toMatchObject(expectedUpdateDto)
  })

  it("queues a browser TypeError transport failure", async () => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    vi.mocked(installationServices.updateInstallation).mockRejectedValue(new TypeError("Failed to fetch"))
    const { result } = renderHook(() => useInstallations())

    await act(async () => {
      await result.current.editInstallation("inst-1", hydratedInstallation)
    })

    expect(offlineStoreMock.queue).toHaveLength(1)
    expect(offlineStoreMock.queue[0]).toMatchObject({
      userId: "test-user-id",
      type: "UPDATE_INSTALLATION",
      payload: { id: "inst-1", data: expectedUpdateDto },
    })
  })

  it("uses the same compact optimistic path when explicitly offline", async () => {
    vi.stubGlobal('navigator', { onLine: false })
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    const { result } = renderHook(() => useInstallations())

    await act(async () => {
      await result.current.editInstallation("inst-1", hydratedInstallation)
      await result.current.editInstallation("inst-1", { ...hydratedInstallation, city: "Rosario" })
    })

    expect(installationServices.updateInstallation).not.toHaveBeenCalled()
    expect(offlineStoreMock.queue).toHaveLength(1)
    expect(offlineStoreMock.queue[0]).toMatchObject({
      type: "UPDATE_INSTALLATION",
      payload: { id: "inst-1", data: { ...expectedUpdateDto, city: "Rosario" } },
    })
    expect(useInstallationStore.getState().installations[0]).toMatchObject({ ...expectedUpdateDto, city: "Rosario" })
  })

  it.each([400, 401, 403, 500, 503])("does not queue HTTP %i and reports the error", async (status) => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    const apiError = new ApiResponseError(`Error HTTP ${status}`, status)
    vi.mocked(installationServices.updateInstallation).mockRejectedValue(apiError)
    const { result } = renderHook(() => useInstallations())

    await expect(result.current.editInstallation("inst-1", hydratedInstallation)).rejects.toBe(apiError)

    expect(offlineStoreMock.queue).toHaveLength(0)
    expect(useInstallationStore.getState().installations[0]).toEqual(hydratedInstallation)

    const onError = vi.fn()
    await act(async () => {
      result.current.setFormData(expectedUpdateDto)
    })
    await act(async () => {
      await result.current.handleSubmitForm(
        { preventDefault: vi.fn() } as unknown as React.FormEvent,
        true,
        hydratedInstallation,
        vi.fn(),
        onError,
        vi.fn(),
        result.current.editInstallation,
      )
    })
    expect(onError).toHaveBeenCalledWith(`Error HTTP ${status}`)
  })

  it("does not queue an HTTP 503 response even if navigator becomes offline", async () => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    const apiError = new ApiResponseError("Servicio no disponible", 503)
    vi.mocked(installationServices.updateInstallation).mockImplementation(async () => {
      vi.stubGlobal('navigator', { onLine: false })
      throw apiError
    })
    const { result } = renderHook(() => useInstallations())

    await expect(result.current.editInstallation("inst-1", hydratedInstallation)).rejects.toBe(apiError)

    expect(offlineStoreMock.queue).toHaveLength(0)
    expect(useInstallationStore.getState().installations[0]).toEqual(hydratedInstallation)
  })

  it("does not queue a generic local error when navigator becomes offline after the request starts", async () => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    const localError = new Error("Unexpected local serialization failure")
    vi.mocked(installationServices.updateInstallation).mockImplementation(async () => {
      vi.stubGlobal('navigator', { onLine: false })
      throw localError
    })
    const { result } = renderHook(() => useInstallations())

    await expect(result.current.editInstallation("inst-1", hydratedInstallation)).rejects.toBe(localError)

    expect(offlineStoreMock.queue).toHaveLength(0)
    expect(useInstallationStore.getState().installations[0]).toEqual(hydratedInstallation)
  })

  it.each([
    ["logout", null, false],
    ["account switch", "other-user", true],
  ])("fails closed when identity changes before a transport failure returns: %s", async (_scenario, nextUserId, isAuthenticated) => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    let rejectUpdate: (error: Error) => void = () => undefined
    vi.mocked(installationServices.updateInstallation).mockImplementation(() => new Promise((_resolve, reject) => {
      rejectUpdate = reject
    }))
    const { result } = renderHook(() => useInstallations())

    const editPromise = result.current.editInstallation("inst-1", hydratedInstallation)
    await waitFor(() => expect(installationServices.updateInstallation).toHaveBeenCalled())
    authStoreMock.userId = nextUserId
    authStoreMock.isAuthenticated = isAuthenticated
    rejectUpdate(new Error("ERR_INTERNET_DISCONNECTED"))

    await expect(editPromise).rejects.toThrow("La sesión cambió")
    expect(offlineStoreMock.queue).toHaveLength(0)
    expect(useInstallationStore.getState().installations[0]).toEqual(hydratedInstallation)
  })

  it.each([
    ["logout", null, false],
    ["account switch", "other-user", true],
  ])("does not apply a successful PUT after session identity changes: %s", async (_scenario, nextUserId, isAuthenticated) => {
    useInstallationStore.setState({ installations: [hydratedInstallation], ownerId: "test-user-id" })
    let resolveUpdate: (installation: typeof hydratedInstallation) => void = () => undefined
    vi.mocked(installationServices.updateInstallation).mockImplementation(() => new Promise((resolve) => {
      resolveUpdate = resolve
    }))
    const { result } = renderHook(() => useInstallations())

    const editPromise = result.current.editInstallation("inst-1", hydratedInstallation)
    await waitFor(() => expect(installationServices.updateInstallation).toHaveBeenCalled())
    authStoreMock.userId = nextUserId
    authStoreMock.isAuthenticated = isAuthenticated
    resolveUpdate({ ...hydratedInstallation, company: "Server update" })

    await expect(editPromise).rejects.toThrow("La sesión cambió")
    expect(offlineStoreMock.queue).toHaveLength(0)
    expect(useInstallationStore.getState().installations[0]).toEqual(hydratedInstallation)
  })
})

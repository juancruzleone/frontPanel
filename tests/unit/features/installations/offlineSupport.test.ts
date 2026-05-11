
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import useInstallations from "../../../../src/features/installations/hooks/useInstallations"
import * as installationServices from "../../../../src/features/installations/services/installationServices"
import { useInstallationStore } from "../../../../src/store/installationStore"

// Mock the services
vi.mock("../../../../src/features/installations/services/installationServices")
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
    useInstallationStore.getState().setInstallations(mockInstallations)
    useInstallationStore.getState().setOwnerId("test-user-id")

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
})

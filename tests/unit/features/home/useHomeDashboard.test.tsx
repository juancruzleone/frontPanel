import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAuthStore } from "../../../../src/store/authStore"
import { buildHomeCacheKey, useHomeStore } from "../../../../src/store/homeStore"
import { useHomeDashboard } from "../../../../src/features/home/hooks/useHomeDashboard"
import { createDashboardDto } from "./dashboardFixture"

const inventoryMock = vi.hoisted(() => vi.fn())
vi.mock("../../../../src/features/inventory/services/inventoryServices", () => ({
  fetchInventoryItems: inventoryMock,
}))

describe("useHomeDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true })
    useHomeStore.setState({ cache: null, lastUpdated: null, ownerId: null })
    useAuthStore.setState({
      isAuthenticated: true,
      isAuthResolved: true,
      user: "User",
      userId: "user-1",
      tenantId: "tenant-a",
      role: "admin",
    })
    inventoryMock
      .mockResolvedValueOnce({ total: 20, items: [] })
      .mockResolvedValueOnce({ total: 3, items: [] })
  })

  it("maps the real metadata scope and stores a role-isolated admin cache", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.metadata.scope).toBe("tenant")
    expect(result.current.inventory).toEqual({ totalItems: 20, lowStockItems: 3 })
    expect(useHomeStore.getState().cache?.cacheKey).toBe(buildHomeCacheKey("tenant-a", "user-1", "admin"))
  })

  it("never requests tenant inventory for clients and accepts assigned installations", async () => {
    act(() => useAuthStore.setState({ role: "cliente" }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("assigned_installations") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.role).toBe("client")
    expect(result.current.data?.metadata.scope).toBe("assigned_installations")
    expect(inventoryMock).not.toHaveBeenCalled()
  })

  it("rejects a tenant-wide payload for a technician", async () => {
    act(() => useAuthStore.setState({ role: "técnico" }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe("home.dashboard.errors.loadFailed")
  })

  it("exposes refreshing while preserving old data during a range transition", async () => {
    let resolveRefresh: ((response: Response) => void) | undefined
    const refreshedResponse = new Promise<Response>((resolve) => { resolveRefresh = resolve })
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
      .mockReturnValueOnce(refreshedResponse)
    const { result } = renderHook(() => useHomeDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setRange("7d"))
    await waitFor(() => expect(result.current.refreshing).toBe(true))
    expect(result.current.data?.metadata.range).toBe("30d")

    const refreshedDto = createDashboardDto("tenant")
    refreshedDto.metadata.range = "7d"
    resolveRefresh?.(new Response(JSON.stringify({ success: true, data: refreshedDto }), { status: 200 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.refreshing).toBe(false)
    expect(result.current.data?.metadata.range).toBe("7d")
  })
})

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAuthStore } from "../../../../src/store/authStore"
import { buildHomeCacheKey, useHomeStore } from "../../../../src/store/homeStore"
import { useHomeDashboard } from "../../../../src/features/home/hooks/useHomeDashboard"
import { createDashboardDto } from "./dashboardFixture"

const inventoryMock = vi.hoisted(() => vi.fn())
const clientsMock = vi.hoisted(() => vi.fn())
vi.mock("../../../../src/features/clients/services/clientServices", () => ({
  getClients: clientsMock,
}))
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
    clientsMock.mockReset().mockResolvedValue([{ _id: "client-1" }, { _id: "client-2" }])
    inventoryMock.mockReset().mockResolvedValue({ total: 0, items: [] })
      .mockResolvedValueOnce({ total: 20, items: [{ _id: "item-1", name: "Filtro", currentStock: 8, unit: "u", minimumStock: 2 }] })
      .mockResolvedValueOnce({ total: 3, items: [{ _id: "item-2", name: "Correa", currentStock: 1, unit: "u", minimumStock: 4 }] })
  })

  it("maps the real metadata scope and stores a role-isolated admin cache", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.metadata.scope).toBe("tenant")
    expect(result.current.data?.resourceMetrics).toContainEqual({ id: "clients", value: 2 })
    expect(clientsMock).toHaveBeenCalledOnce()
    expect(result.current.inventory).toEqual(expect.objectContaining({
      totalItems: 20,
      lowStockItems: 3,
      items: [expect.objectContaining({ _id: "item-1" })],
      lowStockDetails: [expect.objectContaining({ _id: "item-2" })],
    }))
    expect(inventoryMock).toHaveBeenCalledTimes(2)
    expect(inventoryMock).toHaveBeenNthCalledWith(1, { page: 1, limit: 5 })
    expect(inventoryMock).toHaveBeenNthCalledWith(2, { page: 1, limit: 5, lowStock: true })
    expect(useHomeStore.getState().cache?.cacheKey).toBe(buildHomeCacheKey("tenant-a", "user-1", "admin"))
  })

  it("does not delay the dashboard or inventory while the optional clients request is pending", async () => {
    let resolveClients!: (clients: Array<{ _id: string }>) => void
    clientsMock.mockReturnValue(new Promise<Array<{ _id: string }>>((resolve) => { resolveClients = resolve }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(clientsMock).toHaveBeenCalledOnce()
    expect(result.current.data).not.toBeNull()
    expect(result.current.inventory?.totalItems).toBe(20)
    expect(result.current.data?.resourceMetrics.map(({ id }) => id)).not.toContain("clients")

    await act(async () => { resolveClients([{ _id: "client-1" }]) })
    expect(result.current.data?.resourceMetrics).toContainEqual({ id: "clients", value: 1 })
  })

  it("starts the clients request without waiting for inventory", async () => {
    let resolveInventory!: (value: { total: number; items: [] }) => void
    inventoryMock.mockReset().mockReturnValue(new Promise((resolve) => { resolveInventory = resolve }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(clientsMock).toHaveBeenCalledOnce())
    expect(inventoryMock).toHaveBeenCalledTimes(2)
    await act(async () => { resolveInventory({ total: 0, items: [] }) })
    expect(result.current.data?.resourceMetrics).toContainEqual({ id: "clients", value: 2 })
  })

  it("omits failed client enrichment without a panel error and recovers on retry", async () => {
    clientsMock.mockRejectedValue(new Error("Unavailable"))
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.inventoryError).toBe(false)
    expect(result.current.data?.resourceMetrics.map(({ id }) => id)).not.toContain("clients")

    clientsMock.mockResolvedValue([])
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.data?.resourceMetrics).toContainEqual({ id: "clients", value: 0 }))
  })

  it("ignores a late clients response after changing to a non-admin role", async () => {
    let resolveClients!: (clients: Array<{ _id: string }>) => void
    clientsMock.mockReturnValue(new Promise<Array<{ _id: string }>>((resolve) => { resolveClients = resolve }))
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: createDashboardDto("assigned_installations") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => useAuthStore.setState({ role: "cliente" }))
    await waitFor(() => expect(result.current.data?.role).toBe("client"))
    await act(async () => { resolveClients([{ _id: "client-1" }]) })
    expect(result.current.data?.role).toBe("client")
    expect(result.current.data?.resourceMetrics.map(({ id }) => id)).not.toContain("clients")
    expect(clientsMock).toHaveBeenCalledOnce()
  })

  it.each(["items", "lowStock", "both"])("reports %s inventory failures without losing dashboard data and recovers on retry", async (failure) => {
    inventoryMock.mockReset().mockImplementation(({ lowStock }: { lowStock?: boolean }) => {
      if (failure === "both" || (failure === "lowStock") === !!lowStock) return Promise.reject(new Error("Unavailable"))
      return Promise.resolve({ total: 0, items: [] })
    })
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).not.toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.inventory).toBeNull()
    expect(result.current.inventoryError).toBe(true)

    inventoryMock.mockResolvedValue({ total: 0, items: [] })
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.inventoryError).toBe(false))
    expect(result.current.inventory?.items).toEqual([])
    expect(result.current.inventory?.totalItems).toBe(0)
  })

  it("keeps an unavailable cached inventory distinct from a valid empty result offline", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false })
    useHomeStore.setState({ cache: {
      cacheKey: buildHomeCacheKey("tenant-a", "user-1", "admin")!,
      dashboard: createDashboardDto("tenant"),
      inventory: null,
    } })
    const { result } = renderHook(() => useHomeDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.inventoryError).toBe(true)
    expect(result.current.data).not.toBeNull()
    expect(result.current.isOffline).toBe(true)
  })

  it("never requests tenant inventory for clients and accepts assigned installations", async () => {
    act(() => useAuthStore.setState({ role: "cliente" }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("assigned_installations") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.role).toBe("client")
    expect(result.current.data?.metadata.scope).toBe("assigned_installations")
    expect(inventoryMock).not.toHaveBeenCalled()
    expect(clientsMock).not.toHaveBeenCalled()
  })

  it("rejects a tenant-wide payload for a technician", async () => {
    act(() => useAuthStore.setState({ role: "técnico" }))
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: createDashboardDto("tenant") }), { status: 200 }))
    const { result } = renderHook(() => useHomeDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe("home.dashboard.errors.loadFailed")
    expect(clientsMock).not.toHaveBeenCalled()
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

import { beforeEach, describe, expect, it, vi } from "vitest"
import { exportInstallations } from "../../../src/features/installations/services/installationServices"
import { exportWorkOrders } from "../../../src/features/workOrders/services/workOrderServices"
import { exportInventoryMovements } from "../../../src/features/inventory/services/inventoryServices"

const downloadResponse = vi.hoisted(() => vi.fn())
vi.mock("../../../src/shared/utils/downloadResponse", () => ({ downloadResponse }))
vi.mock("../../../src/shared/utils/apiHeaders", () => ({
  getAuthHeaders: vi.fn(() => ({ Authorization: "Bearer token" })),
  getHeadersWithContentType: vi.fn(() => ({})),
  fetchWithCsrf: vi.fn(),
  // Downloads now route through the auth-retry wrapper; delegate to plain fetch for determinism
  fetchWithAuthRetry: async (url: string, options: RequestInit = {}) => fetch(url, { ...options, credentials: "include" }),
}))
vi.mock("../../../src/store/authStore", () => ({ useAuthStore: { getState: () => ({ role: "admin" }) } }))

describe("operational CSV services", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }))
  })

  it("preserves active installation filters and downloads the response", async () => {
    await exportInstallations({ search: "north plant", category: "Office" })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("installations/csv/export?search=north+plant&category=Office"), expect.objectContaining({ credentials: "include" }))
    expect(downloadResponse).toHaveBeenCalledWith(expect.anything(), expect.any(String), "installations.csv")
  })

  it("preserves all current work-order filters without pagination", async () => {
    await exportWorkOrders({ estado: "asignada", prioridad: "alta", tecnicoId: "tech-1", startDate: "2026-08-01", endDate: "2026-08-31", search: "pump" })
    const url = vi.mocked(fetch).mock.calls[0][0].toString()
    expect(url).toContain("ordenes-trabajo/csv/export?")
    expect(url).toContain("estado=asignada")
    expect(url).toContain("tecnicoId=tech-1")
    expect(url).not.toContain("page=")
    expect(downloadResponse).toHaveBeenCalledWith(expect.anything(), expect.any(String), "work-orders.csv")
  })

  it("encodes the selected inventory item and downloads its complete history", async () => {
    await exportInventoryMovements("item/1")
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("inventario/item%2F1/movimientos/csv/export"), expect.objectContaining({ credentials: "include" }))
    expect(downloadResponse).toHaveBeenCalledWith(expect.anything(), expect.any(String), "inventory-movements.csv")
  })
})

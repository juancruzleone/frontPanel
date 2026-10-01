import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchDashboardStats, parseDashboardStatsResponse } from "../../../../src/features/home/services/dashboardStatsService"
import { createDashboardDto } from "./dashboardFixture"

const fetchWithAuthRetry = vi.hoisted(() => vi.fn())

vi.mock("../../../../src/shared/utils/apiHeaders", () => ({ fetchWithAuthRetry }))

describe("dashboard stats transport and contract", () => {
  beforeEach(() => fetchWithAuthRetry.mockReset())

  it("requests comparison data for the effective range through the shared auth retry wrapper", async () => {
    fetchWithAuthRetry.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: createDashboardDto("tenant"),
    }), { status: 200 }))

    await expect(fetchDashboardStats("90d")).resolves.toEqual(expect.objectContaining({ success: true }))

    expect(fetchWithAuthRetry).toHaveBeenCalledOnce()
    expect(fetchWithAuthRetry).toHaveBeenCalledWith(expect.stringMatching(/dashboard\/stats\?(?=.*range=90d)(?=.*compare=true)/))
  })

  it("accepts an honestly unavailable previous window", () => {
    const data = createDashboardDto("tenant")
    data.kpisPrevious = null
    data.previousWindow.available = false

    expect(parseDashboardStatsResponse({ success: true, data }).data.kpisPrevious).toBeNull()
  })

  it.each([
    ["missing charts", (data: Record<string, unknown>) => Reflect.deleteProperty(data, "charts")],
    ["partial KPI", (data: Record<string, unknown>) => Reflect.deleteProperty(data.kpis as object, "overdueWorkOrders")],
    ["invalid chart collection", (data: Record<string, unknown>) => { (data.charts as Record<string, unknown>).deviceHealth = null }],
    ["inconsistent comparison availability", (data: Record<string, unknown>) => { (data.previousWindow as Record<string, unknown>).available = false }],
  ])("rejects a %s payload before mapping", (_label, mutate) => {
    const data = createDashboardDto("tenant") as unknown as Record<string, unknown>
    mutate(data)
    expect(() => parseDashboardStatsResponse({ success: true, data })).toThrow("DASHBOARD_PAYLOAD_INVALID")
  })

  it("rejects a malformed successful response in a controlled promise", async () => {
    fetchWithAuthRetry.mockResolvedValue(new Response(JSON.stringify({ success: true, data: { metadata: {} } }), { status: 200 }))
    await expect(fetchDashboardStats("30d")).rejects.toThrow("DASHBOARD_PAYLOAD_INVALID")
  })
})

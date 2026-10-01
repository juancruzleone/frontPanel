import { describe, expect, it } from "vitest"
import {
  expectedDashboardScope,
  mapDashboardStats,
  normalizeDashboardRole,
} from "../../../../src/features/home/services/homeDashboardMapper"
import { createDashboardDto } from "./dashboardFixture"

describe("home dashboard role-aware mapper", () => {
  it("normalizes supported roles and fails closed for unknown roles", () => {
    expect(normalizeDashboardRole("admin")).toBe("admin")
    expect(normalizeDashboardRole("tecnico")).toBe("technician")
    expect(normalizeDashboardRole("técnico")).toBe("technician")
    expect(normalizeDashboardRole("cliente")).toBe("client")
    expect(normalizeDashboardRole("auditor")).toBeNull()
  })

  it.each([
    ["admin", "tenant"],
    ["technician", "assigned_work"],
    ["client", "assigned_installations"],
  ] as const)("requires the %s DTO scope", (role, scope) => {
    expect(expectedDashboardScope(role)).toBe(scope)
    expect(mapDashboardStats(createDashboardDto(scope), role).metadata.scope).toBe(scope)
  })

  it("exposes client installation and device metrics without tenant resources", () => {
    const result = mapDashboardStats(createDashboardDto("assigned_installations"), "client")
    expect(result.resourceMetrics).toEqual([
      { id: "installations", value: 3 },
      { id: "devices", value: 10 },
    ])
    expect(result.resourceMetrics.map(({ id }) => id)).not.toContain("technicians")
    expect(result.upcomingPreventive[0]).toMatchObject({ date: "2026-08-30", planName: "Inspección" })
  })

  it.each([0, 5])("includes a known admin clients count of %s", (count) => {
    const result = mapDashboardStats(createDashboardDto("tenant"), "admin", count)
    expect(result.resourceMetrics).toContainEqual({ id: "clients", value: count })
    expect(result.resourceMetrics).toHaveLength(4)
  })

  it("omits an unavailable clients count instead of presenting a false zero", () => {
    const result = mapDashboardStats(createDashboardDto("tenant"), "admin")
    expect(result.resourceMetrics.map(({ id }) => id)).not.toContain("clients")
  })

  it.each([
    ["client", "assigned_installations"],
    ["technician", "assigned_work"],
  ] as const)("never exposes the clients count to %s", (role, scope) => {
    const result = mapDashboardStats(createDashboardDto(scope), role, 5)
    expect(result.resourceMetrics.map(({ id }) => id)).not.toContain("clients")
  })

  it("rejects a broader scope than the authenticated role", () => {
    expect(() => mapDashboardStats(createDashboardDto("tenant"), "technician")).toThrow("DASHBOARD_SCOPE_MISMATCH")
    expect(() => mapDashboardStats(createDashboardDto("tenant"), "client")).toThrow("DASHBOARD_SCOPE_MISMATCH")
  })

  it("maps contextual KPI outcomes without dividing by a zero previous value", () => {
    const dto = createDashboardDto("tenant")
    dto.operationalKpis = {
      ...dto.operationalKpis,
      overdueWorkOrders: 0,
      criticalWorkOrders: 3,
      mttrHours: 3,
      mtbfHours: 100,
      preventiveComplianceRate: 0,
      slaRate: 0,
      responseTimeHours: 2,
    }
    dto.kpisPrevious = {
      ...dto.kpisPrevious!,
      overdueWorkOrders: 2,
      criticalWorkOrders: 0,
      mttrHours: 4,
      mtbfHours: 90,
      preventiveComplianceRate: 0,
      slaRate: 80,
      responseTimeHours: 1,
    }

    const metrics = new Map(mapDashboardStats(dto, "admin").metrics.map((metric) => [metric.id, metric.comparison]))
    expect(metrics.get("overdueWorkOrders")).toMatchObject({ direction: "down", outcome: "improved", delta: -2 })
    expect(metrics.get("criticalWorkOrders")).toMatchObject({ direction: "up", outcome: "worsened", delta: 3 })
    expect(metrics.get("mttrHours")).toMatchObject({ outcome: "improved" })
    expect(metrics.get("mtbfHours")).toMatchObject({ outcome: "improved" })
    expect(metrics.get("preventiveComplianceRate")).toMatchObject({ direction: "unchanged", outcome: "unchanged", delta: 0 })
    expect(metrics.get("slaRate")).toMatchObject({ direction: "down", outcome: "worsened", delta: -80 })
    expect(metrics.get("responseTimeHours")).toMatchObject({ direction: "up", outcome: "worsened" })
  })

  it("marks comparison unavailable unless both periods are measurable", () => {
    const dto = createDashboardDto("tenant")
    dto.operationalKpis.preventiveComplianceRate = null
    dto.kpisPrevious!.slaRate = null
    let result = mapDashboardStats(dto, "admin")
    expect(result.metrics.find(({ id }) => id === "preventiveComplianceRate")?.comparison).toEqual({ status: "unavailable" })
    expect(result.metrics.find(({ id }) => id === "slaRate")?.comparison).toEqual({ status: "unavailable" })

    dto.kpisPrevious = null
    dto.previousWindow.available = false
    result = mapDashboardStats(dto, "admin")
    expect(result.metrics.every(({ comparison }) => comparison.status === "unavailable")).toBe(true)
  })
})

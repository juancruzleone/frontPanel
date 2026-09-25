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
})

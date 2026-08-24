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

  it("rejects a broader scope than the authenticated role", () => {
    expect(() => mapDashboardStats(createDashboardDto("tenant"), "technician")).toThrow("DASHBOARD_SCOPE_MISMATCH")
    expect(() => mapDashboardStats(createDashboardDto("tenant"), "client")).toThrow("DASHBOARD_SCOPE_MISMATCH")
  })
})

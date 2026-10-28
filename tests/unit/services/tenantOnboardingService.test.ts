import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  fetchTenantOnboardingStatus,
  completeTenantOnboarding,
  isOnboardingIncompleteError,
  getOnboardingIncompleteGuidance,
  TenantOnboardingError,
} from "../../../src/shared/services/tenantOnboardingService"

const okStatus = {
  status: "incomplete",
  version: 1,
  completedAt: null,
  checks: {
    company: true,
    installationTypes: false,
    deviceCategories: false,
    formCategories: false,
    maintenanceTemplate: false,
  },
  missing: ["installationTypes", "deviceCategories", "formCategories", "maintenanceTemplate"],
}

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  }) as unknown as Response

describe("tenantOnboardingService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
  })

  it("obtiene el estado del onboarding con la forma del contrato", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(okStatus))
    const result = await fetchTenantOnboardingStatus()
    expect(result.status).toBe("incomplete")
    expect(result.version).toBe(1)
    expect(result.completedAt).toBeNull()
    expect(result.checks.company).toBe(true)
    expect(result.checks.maintenanceTemplate).toBe(false)
    expect(result.missing).toContain("installationTypes")
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("tenant/onboarding"),
      expect.objectContaining({ headers: expect.objectContaining({ "X-Requested-With": "XMLHttpRequest" }) }),
    )
  })

  it("completa el onboarding y devuelve el estado completo", async () => {
    const done = { ...okStatus, status: "complete", completedAt: "2026-01-01T00:00:00.000Z", missing: [] }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(done))
    const result = await completeTenantOnboarding()
    expect(result.status).toBe("complete")
    expect(result.missing).toEqual([])
  })

  it("el 409 de complete lanza un error con la lista missing del servidor sin mutar nada", async () => {
    const conflict = {
      success: false,
      error: {
        code: "ONBOARDING_REQUIREMENTS_MISSING",
        message: "Faltan requisitos",
        missing: ["installationTypes", "deviceCategories"],
        checks: okStatus.checks,
      },
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(conflict, 409))
    const thrown = await completeTenantOnboarding().catch((error: unknown) => error)
    expect(thrown).toBeInstanceOf(TenantOnboardingError)
    const typed = thrown as TenantOnboardingError
    expect(typed.code).toBe("ONBOARDING_REQUIREMENTS_MISSING")
    expect(typed.status).toBe(409)
    expect(typed.missing).toEqual(["installationTypes", "deviceCategories"])
  })

  it("un fallo del servidor lanza un mensaje en español", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ error: { message: "boom" } }, 500))
    await expect(fetchTenantOnboardingStatus()).rejects.toThrow("boom")
  })

  it("detecta el 403 ONBOARDING_INCOMPLETE de llamadas operativas", () => {
    expect(
      isOnboardingIncompleteError({ success: false, error: { code: "ONBOARDING_INCOMPLETE", missing: [] } }),
    ).toBe(true)
    expect(isOnboardingIncompleteError({ success: false, error: { code: "OTHER" } })).toBe(false)
    expect(isOnboardingIncompleteError(null)).toBe(false)
  })

  it("la guía del 403 es en español y no usa localStorage", () => {
    localStorage.clear()
    const guidance = getOnboardingIncompleteGuidance(["installationTypes"])
    expect(guidance).toMatch(/configuraci/i)
    expect(localStorage.getItem("leonix-global-onboarding-v2-completed")).toBeNull()
    expect(localStorage.length).toBe(0)
  })
})

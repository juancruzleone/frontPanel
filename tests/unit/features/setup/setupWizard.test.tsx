import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { SetupWizard } from "../../../../src/features/setup/components/SetupWizard"
import { __resetOnboardingStatusCache } from "../../../../src/features/setup/hooks/useTenantOnboarding"
import { useAuthStore } from "../../../../src/store/authStore"
import "../../../../src/i18n"

const baseChecks = {
  company: false,
  installationTypes: false,
  deviceCategories: false,
  formCategories: false,
  maintenanceTemplate: false,
}

const statusFor = (checks: typeof baseChecks, status = "incomplete") => ({
  status,
  version: 1,
  completedAt: null,
  checks,
  missing: Object.entries(checks)
    .filter(([, done]) => !done)
    .map(([key]) => key),
})

const jsonResponse = (body: unknown, statusCode = 200) =>
  ({
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    headers: { get: () => "application/json" },
    json: async () => body,
  }) as unknown as Response

const loginAs = (role: string) =>
  useAuthStore.setState({
    accessMode: "full",
    isAuthResolved: true,
    isAuthenticated: true,
    user: "user",
    userId: "user-1",
    role,
  })

const renderWizard = () =>
  render(
    <MemoryRouter>
      <SetupWizard />
    </MemoryRouter>,
  )

describe("SetupWizard", () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout()
    vi.clearAllMocks()
    // S6: la caché entre navegaciones no debe filtrarse entre casos.
    __resetOnboardingStatusCache()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
  })

  it("muestra los pasos en el orden obligatorio", async () => {
    loginAs("admin")
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(statusFor(baseChecks)),
    )
    renderWizard()
    const steps = await screen.findAllByTestId("setup-step")
    const labels = steps.map((step) => step.getAttribute("data-step"))
    expect(labels).toEqual([
      "company",
      "installationTypes",
      "deviceCategories",
      "formCategories",
      "maintenanceTemplate",
    ])
  })

  it("bloquea los pasos posteriores hasta completar el anterior", async () => {
    loginAs("admin")
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(statusFor({ ...baseChecks, company: true })),
    )
    renderWizard()
    const steps = await screen.findAllByTestId("setup-step")
    const byKey = (key: string) => steps.find((step) => step.getAttribute("data-step") === key)
    expect(byKey("company")).toHaveAttribute("data-state", "done")
    expect(byKey("installationTypes")).toHaveAttribute("data-state", "current")
    expect(byKey("deviceCategories")).toHaveAttribute("data-state", "locked")
  })

  it("un rol no administrador ve espera en lugar del botón de completar", async () => {
    loginAs("tecnico")
    const allDone = {
      company: true,
      installationTypes: true,
      deviceCategories: true,
      formCategories: true,
      maintenanceTemplate: true,
    }
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(statusFor(allDone, "incomplete")),
    )
    renderWizard()
    expect(await screen.findByText(/espera/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /completar/i })).not.toBeInTheDocument()
  })

  it("el 409 de complete muestra la lista missing del servidor", async () => {
    loginAs("admin")
    const allDone = {
      company: true,
      installationTypes: true,
      deviceCategories: true,
      formCategories: true,
      maintenanceTemplate: true,
    }
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(jsonResponse(statusFor(allDone, "incomplete")))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            success: false,
            error: {
              code: "ONBOARDING_REQUIREMENTS_MISSING",
              message: "Faltan requisitos",
              missing: ["deviceCategories"],
            },
          },
          409,
        ),
      )
    const user = userEvent.setup()
    renderWizard()
    const completeButton = await screen.findByRole("button", { name: /completar/i })
    await user.click(completeButton)
    expect(await screen.findByText(/deviceCategories/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("tenant/onboarding/complete"),
        expect.anything(),
      )
    })
  })
})

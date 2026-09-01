import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { BillingAccessPage } from "../../../../src/features/billing/pages/BillingAccessPage"
import { useBillingStatus } from "../../../../src/features/billing/hooks/useBillingStatus"
import { createCheckout, navigateToCheckout, saveCheckoutIntentId } from "../../../../src/features/billing/services/billingService"
import "../../../../src/i18n"

vi.mock("../../../../src/features/billing/hooks/useBillingStatus")
vi.mock("../../../../src/features/billing/services/billingService", () => ({
  createCheckout: vi.fn(),
  navigateToCheckout: vi.fn(),
  saveCheckoutIntentId: vi.fn(),
}))

const billingData = {
  accessMode: "billing_only" as const,
  tenant: { tenantId: "tenant-1", name: "Acme", plan: "professional", status: "active" },
  trial: { status: "expired", plan: "professional" as const, startsAt: "2026-08-01", endsAt: "2026-08-31" },
  subscription: null,
  availablePlans: [
    { planId: "starter" as const, name: "Starter", monthlyPrice: 10, yearlyPrice: 100 },
    { planId: "professional" as const, name: "Professional", monthlyPrice: 20, yearlyPrice: 200 },
  ],
}

describe("BillingAccessPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows loading and status errors", () => {
    vi.mocked(useBillingStatus).mockReturnValue({ data: null, loading: true, error: null, retry: vi.fn() })
    const { rerender } = render(<BillingAccessPage />)
    expect(screen.getByText(/cargando opciones|loading billing/i)).toBeInTheDocument()

    vi.mocked(useBillingStatus).mockReturnValue({ data: null, loading: false, error: "Unavailable", retry: vi.fn() })
    rerender(<BillingAccessPage />)
    expect(screen.getByText("Unavailable")).toBeInTheDocument()
  })

  it("disables checkout while loading and reports provider errors", async () => {
    vi.mocked(useBillingStatus).mockReturnValue({ data: billingData, loading: false, error: null, retry: vi.fn() })
    let rejectCheckout: (reason: Error) => void = () => undefined
    vi.mocked(createCheckout).mockReturnValue(new Promise((_, reject) => { rejectCheckout = reject }))
    const { container } = render(<BillingAccessPage />)

    const button = container.querySelector("button") as HTMLButtonElement
    fireEvent.click(button)
    expect(button).toBeDisabled()
    rejectCheckout(new Error("Provider unavailable"))
    expect(await screen.findByText("Provider unavailable")).toBeInTheDocument()
    expect(navigateToCheckout).not.toHaveBeenCalled()
    expect(saveCheckoutIntentId).not.toHaveBeenCalled()
  })
})

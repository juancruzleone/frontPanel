import { act, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BillingReturnPage } from "../../../../src/features/billing/pages/BillingReturnPage"
import { useAuthStore } from "../../../../src/store/authStore"
import { getCheckoutStatus, promoteBillingSession } from "../../../../src/features/billing/services/billingService"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../../src/router/useTranslatedRoutes", () => ({
  useTranslatedRoutes: () => ({ getRoute: () => "/home" }),
}))

vi.mock("../../../../src/store/authStore", () => ({
  useAuthStore: vi.fn(),
}))

vi.mock("../../../../src/features/billing/services/billingService", () => ({
  clearCheckoutIntentId: vi.fn(),
  getCheckoutStatus: vi.fn(),
  promoteBillingSession: vi.fn(),
  readCheckoutIntentId: vi.fn(() => "intent-12345678"),
}))

const renderReturnPage = () => render(
  <MemoryRouter initialEntries={["/billing/return"]}>
    <Routes>
      <Route path="/billing/return" element={<BillingReturnPage />} />
      <Route path="/home" element={<div>Home</div>} />
    </Routes>
  </MemoryRouter>,
)

describe("BillingReturnPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  it("redirects a fully authenticated session without polling or promoting", async () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession: vi.fn(),
      isAuthenticated: true,
      isAuthResolved: true,
      accessMode: "full",
    }))

    renderReturnPage()

    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(getCheckoutStatus).not.toHaveBeenCalled()
    expect(promoteBillingSession).not.toHaveBeenCalled()
  })

  it("continues polling a pending billing-only checkout", async () => {
    vi.useFakeTimers()
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      hydrateSession: vi.fn(),
      isAuthenticated: false,
      isAuthResolved: true,
      accessMode: "billing_only",
    }))
    vi.mocked(getCheckoutStatus).mockResolvedValue({
      checkoutIntentId: "intent-12345678",
      status: "pending",
      accessMode: "billing_only",
    })

    renderReturnPage()

    await act(async () => { await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(2)
    expect(promoteBillingSession).not.toHaveBeenCalled()
  })
})

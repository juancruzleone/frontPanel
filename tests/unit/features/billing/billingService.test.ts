import { beforeEach, describe, expect, it, vi } from "vitest"
import { createCheckout, navigateToCheckout, promoteBillingSession } from "../../../../src/features/billing/services/billingService"
import { useCSRFStore } from "../../../../src/store/csrfStore"

describe("billingService", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    useCSRFStore.setState({ token: "csrf", error: null })
  })

  it("sends only planId and billingCycle to checkout", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { checkoutIntentId: "intent-12345678", checkoutUrl: "https://pay.example.test", provider: "test", status: "pending" },
    }), { status: 201 }))

    await createCheckout({ planId: "professional", billingCycle: "yearly" })

    const request = vi.mocked(fetch).mock.calls[0][1]
    expect(JSON.parse(String(request?.body))).toEqual({ planId: "professional", billingCycle: "yearly" })
    expect(String(request?.body)).not.toMatch(/tenant|email|provider/)
  })

  it("isolates checkout navigation and rejects unsafe protocols", () => {
    const assign = vi.fn()
    navigateToCheckout("https://payments.example.test/checkout", assign)
    expect(assign).toHaveBeenCalledWith("https://payments.example.test/checkout")

    expect(() => navigateToCheckout("javascript:alert(1)", assign)).toThrow("La URL de pago no es segura")
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it("shares an in-flight session promotion request", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      authenticated: true,
      accessMode: "full",
      user: { _id: "admin-1", role: "admin" },
    }), { status: 200 }))

    const firstPromotion = promoteBillingSession()
    const secondPromotion = promoteBillingSession()

    expect(secondPromotion).toBe(firstPromotion)
    await expect(Promise.all([firstPromotion, secondPromotion])).resolves.toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

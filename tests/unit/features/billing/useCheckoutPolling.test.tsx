import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCheckoutPolling } from "../../../../src/features/billing/hooks/useCheckoutPolling"
import { getCheckoutStatus, promoteBillingSession } from "../../../../src/features/billing/services/billingService"
import { ApiError } from "../../../../src/shared/services/ApiError"

vi.mock("../../../../src/features/billing/services/billingService", () => ({
  getCheckoutStatus: vi.fn(),
  promoteBillingSession: vi.fn(),
  clearCheckoutIntentId: vi.fn(),
}))

describe("useCheckoutPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it("stops after the bounded number of attempts and cleans up timers", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ checkoutIntentId: "intent-12345678", status: "pending", accessMode: "billing_only" })
    const onPromoted = vi.fn()
    const { result, unmount } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 2,
      baseDelayMs: 10,
      onPromoted,
    }))

    await act(async () => { await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(10); await Promise.resolve() })
    expect(result.current.error).toBe("billing.return.timeout")
    expect(getCheckoutStatus).toHaveBeenCalledTimes(2)
    unmount()
    await act(async () => { vi.runAllTimers(); await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(2)
  })

  it("promotes a paid checkout once", async () => {
    const onPromoted = vi.fn()
    vi.mocked(getCheckoutStatus).mockResolvedValue({ checkoutIntentId: "intent-12345678", status: "paid", accessMode: "full" })
    vi.mocked(promoteBillingSession).mockResolvedValue({
      authenticated: true,
      accessMode: "full",
      user: { _id: "admin-1", role: "admin", tenantId: "tenant-1" },
    })

    renderHook(() => useCheckoutPolling({ checkoutIntentId: "intent-12345678", onPromoted }))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(onPromoted).toHaveBeenCalledTimes(1)
    expect(promoteBillingSession).toHaveBeenCalledTimes(1)
  })

  it("retries transient status failures with backoff", async () => {
    vi.mocked(getCheckoutStatus)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ checkoutIntentId: "intent-12345678", status: "pending", accessMode: "billing_only" })
    const { result } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 2,
      baseDelayMs: 10,
      onPromoted: vi.fn(),
    }))

    await act(async () => { await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(9); await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe("billing.return.timeout")
  })

  it("keeps billing pending while promotion retries", async () => {
    const onPromoted = vi.fn()
    vi.mocked(getCheckoutStatus).mockResolvedValue({ checkoutIntentId: "intent-12345678", status: "paid", accessMode: "full" })
    vi.mocked(promoteBillingSession)
      .mockRejectedValueOnce(new ApiError(503, null, "Unavailable"))
      .mockResolvedValueOnce({ authenticated: true, accessMode: "full", user: { _id: "admin-1", role: "admin" } })
    const { result } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 2,
      baseDelayMs: 10,
      onPromoted,
    }))

    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(result.current.status).toBe("paid")
    expect(onPromoted).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(10); await Promise.resolve(); await Promise.resolve() })
    expect(onPromoted).toHaveBeenCalledTimes(1)
  })

  it("does not retry terminal failures", async () => {
    vi.mocked(getCheckoutStatus).mockRejectedValue(new ApiError(403, null, "Capability expired"))
    const { result } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 3,
      baseDelayMs: 10,
      onPromoted: vi.fn(),
    }))

    await act(async () => { await Promise.resolve() })
    expect(result.current.error).toBe("Capability expired")
    await act(async () => { vi.runAllTimers(); await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(1)
  })

  it("manual retry starts a new bounded polling run", async () => {
    vi.mocked(getCheckoutStatus).mockResolvedValue({ checkoutIntentId: "intent-12345678", status: "pending", accessMode: "billing_only" })
    const { result } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 1,
      baseDelayMs: 10,
      onPromoted: vi.fn(),
    }))

    await act(async () => { await Promise.resolve() })
    expect(result.current.error).toBe("billing.return.timeout")
    act(() => result.current.retry())
    await act(async () => { await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(2)
    expect(result.current.attempts).toBe(1)
  })

  it("cancels a scheduled retry on unmount", async () => {
    vi.mocked(getCheckoutStatus).mockRejectedValue(new TypeError("Failed to fetch"))
    const { unmount } = renderHook(() => useCheckoutPolling({
      checkoutIntentId: "intent-12345678",
      maxAttempts: 3,
      baseDelayMs: 10,
      onPromoted: vi.fn(),
    }))

    await act(async () => { await Promise.resolve() })
    unmount()
    await act(async () => { vi.runAllTimers(); await Promise.resolve() })
    expect(getCheckoutStatus).toHaveBeenCalledTimes(1)
  })
})

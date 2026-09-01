import { useCallback, useEffect, useRef, useState } from "react"
import { clearCheckoutIntentId, getCheckoutStatus, promoteBillingSession } from "../services/billingService"
import type { CheckoutStatus } from "../types/billing.types"
import type { LoginResponse } from "@/store/authStore"
import { isRetriableRequestError } from "@/shared/services/ApiError"

export interface CheckoutPollingOptions {
  checkoutIntentId: string | null
  enabled?: boolean
  maxAttempts?: number
  baseDelayMs?: number
  onPromoted: (response: LoginResponse) => void
}

export const useCheckoutPolling = ({
  checkoutIntentId,
  enabled = true,
  maxAttempts = 8,
  baseDelayMs = 1000,
  onPromoted,
}: CheckoutPollingOptions) => {
  const [status, setStatus] = useState<CheckoutStatus | "invalid">(checkoutIntentId ? "pending" : "invalid")
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [pollRun, setPollRun] = useState(0)
  const onPromotedRef = useRef(onPromoted)
  onPromotedRef.current = onPromoted

  const retry = useCallback(() => {
    setStatus(checkoutIntentId ? "pending" : "invalid")
    setError(null)
    setAttempts(0)
    setPollRun((current) => current + 1)
  }, [checkoutIntentId])

  useEffect(() => {
    if (!enabled || !checkoutIntentId) return
    let cancelled = false
    let timeoutId: number | undefined

    const scheduleNext = (attempt: number) => {
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 8000)
      timeoutId = window.setTimeout(() => { void poll(attempt + 1) }, delay)
    }

    const poll = async (attempt: number): Promise<void> => {
      try {
        const result = await getCheckoutStatus(checkoutIntentId)
        if (cancelled) return
        setAttempts(attempt)
        setStatus(result.status)

        if (result.status === "paid") {
          const promoted = await promoteBillingSession()
          if (!cancelled) {
            clearCheckoutIntentId()
            onPromotedRef.current(promoted)
          }
          return
        }

        if (result.status === "failed" || result.status === "cancelled") {
          clearCheckoutIntentId()
          return
        }

        if (attempt >= maxAttempts) {
          setError("billing.return.timeout")
          return
        }

        scheduleNext(attempt)
      } catch (pollError) {
        if (cancelled) return
        setAttempts(attempt)
        if (!isRetriableRequestError(pollError)) {
          setError(pollError instanceof Error ? pollError.message : "billing.errors.checkoutStatus")
          return
        }
        if (attempt >= maxAttempts) {
          setError("billing.return.timeout")
          return
        }
        scheduleNext(attempt)
      }
    }

    void poll(1)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [baseDelayMs, checkoutIntentId, enabled, maxAttempts, pollRun])

  return { status, error, attempts, retry }
}

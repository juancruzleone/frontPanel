import { beforeEach, describe, expect, it, vi } from "vitest"
import { userLogin } from "../../../../src/features/auth/services/loginServices"
import { ApiError } from "../../../../src/shared/services/ApiError"

describe("userLogin", () => {
  beforeEach(() => vi.mocked(fetch).mockReset())

  it("preserves the status, code, and payload for an expired trial", async () => {
    const payload = {
      accessMode: "billing_only",
      error: { code: "TRIAL_EXPIRED", message: "Trial expired" },
      trial: { status: "expired", plan: "professional", startsAt: "2026-08-01", endsAt: "2026-08-31" },
      billingSession: { expiresAt: "2026-08-31T14:00:00Z" },
      csrfToken: "csrf-token",
    }
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(payload), { status: 403 }))

    const error = await userLogin("admin", "Password1!").catch((failure: unknown) => failure)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 403, code: "TRIAL_EXPIRED", payload })
  })
})

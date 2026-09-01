import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router"
import { useLogin } from "../../../../src/features/auth/hooks/useLogin"
import { userLogin } from "../../../../src/features/auth/services/loginServices"
import { ApiError } from "../../../../src/shared/services/ApiError"
import { useAuthStore } from "../../../../src/store/authStore"
import { useCSRFStore } from "../../../../src/store/csrfStore"
import "../../../../src/i18n"

vi.mock("../../../../src/features/auth/services/loginServices", () => ({ userLogin: vi.fn() }))

const LoginHarness = () => {
  const login = useLogin()
  return (
    <form onSubmit={(event) => void login.handleSubmit(event)}>
      <input name="username" value={login.username} onChange={(event) => login.handleUsernameChange(event.target.value)} />
      <input name="password" value={login.password} onChange={(event) => login.handlePasswordChange(event.target.value)} />
      <button type="submit">submit</button>
    </form>
  )
}

describe("useLogin expired trial flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().logout()
    useCSRFStore.setState({ token: null, error: null })
  })

  it("enters billing-only mode and routes directly to billing", async () => {
    const payload = {
      accessMode: "billing_only",
      error: { code: "TRIAL_EXPIRED", message: "Trial expired" },
      trial: { status: "expired", plan: "professional", startsAt: "2026-08-01", endsAt: "2026-08-31" },
      billingSession: { expiresAt: "2026-08-31T14:00:00Z" },
      csrfToken: "billing-csrf",
    }
    vi.mocked(userLogin).mockRejectedValue(new ApiError(403, payload, "Expired"))
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<LoginHarness />} />
          <Route path="/billing" element={<p>billing page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    const form = container.querySelector("form") as HTMLFormElement
    fireEvent.change(form.elements.namedItem("username") as HTMLInputElement, { target: { value: "admin" } })
    fireEvent.change(form.elements.namedItem("password") as HTMLInputElement, { target: { value: "Password1!" } })
    fireEvent.submit(form)

    await screen.findByText("billing page")
    await waitFor(() => expect(useAuthStore.getState()).toMatchObject({ accessMode: "billing_only", isAuthenticated: false }))
    expect(useCSRFStore.getState().token).toBe("billing-csrf")
  })
})

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAuthStore } from "../../../../src/store/authStore"
import { useCSRFStore } from "../../../../src/store/csrfStore"
import { verifySession } from "../../../../src/features/auth/services/loginServices"
import { fetchCsrfToken } from "../../../../src/shared/services/csrfServices"
import type { LoginResponse } from "../../../../src/store/authStore"
import OAuthCallback from "../../../../src/pages/OAuthCallback"

// The callback page is the only place frontGMAO touches after backPanel has
// finished the OAuth transaction. It may verify the HttpOnly cookie session,
// hydrate CSRF and auth state, and navigate to a safe target — in that order,
// never on failure, and never with a value taken from the query unvalidated.

const navigations = vi.hoisted(() => [] as Array<[unknown, unknown]>)
const order: string[] = []

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate()
      return (to: unknown, options?: unknown) => {
        navigations.push([to, options])
        return (navigate as (target: unknown, opts?: unknown) => void)(to, options)
      }
    },
  }
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `t(${key})`,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../src/features/auth/services/loginServices")
vi.mock("../../../../src/shared/services/csrfServices")

const sessionResponse = (): LoginResponse => ({
  user: { _id: "user-1", userName: "tec", role: "tecnico", tenantId: "tenant-1" },
  csrfToken: "csrf-from-verify",
})

const Probe = () => <p data-testid="location">{useLocation().pathname}</p>

const renderCallback = (search = "", { strictMode = false }: { strictMode?: boolean } = {}) => {
  const tree = (
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/" element={<Probe />} />
        <Route path="/inicio" element={<Probe />} />
        <Route path="/ordenes-trabajo" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  )

  return render(strictMode ? <React.StrictMode>{tree}</React.StrictMode> : tree)
}

const expectLocation = async (pathname: string) => {
  await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(pathname))
}

let unsubscribes: Array<() => void> = []

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  navigations.length = 0
  order.length = 0

  useAuthStore.setState({
    user: null,
    userId: null,
    token: null,
    role: null,
    tenantId: null,
    permissions: null,
    isAuthenticated: false,
    isAuthResolved: false,
    accessMode: "anonymous",
  })
  useCSRFStore.setState({ token: null, isLoading: false, error: null })

  unsubscribes = [
    useAuthStore.subscribe((state, previous) => {
      if (state.isAuthenticated && !previous.isAuthenticated) order.push("hydrate")
    }),
    useCSRFStore.subscribe((state, previous) => {
      if (state.token && !previous.token) order.push("csrf")
    }),
  ]

  vi.stubGlobal("fetch", vi.fn(async () => {
    throw new Error("the callback page must not fetch outside the public services")
  }))
})

afterEach(() => {
  unsubscribes.forEach((unsubscribe) => unsubscribe())
  unsubscribes = []
  vi.unstubAllGlobals()
})

describe("oauth callback verification order", () => {
  it("shows an accessible verifying state and hydrates nothing before the session is confirmed", async () => {
    let release!: (value: LoginResponse) => void
    vi.mocked(verifySession).mockImplementation(
      () => new Promise<LoginResponse>((resolve) => { release = resolve }),
    )

    renderCallback("?returnTo=%2Fordenes-trabajo")

    expect(screen.getByRole("status")).toHaveTextContent("t(auth.oauth.callback.verifying)")
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useCSRFStore.getState().token).toBeNull()
    expect(navigations).toEqual([])

    release(sessionResponse())
    await expectLocation("/ordenes-trabajo")
  })

  it("verifies the session, hydrates CSRF, and only then hydrates auth state", async () => {
    vi.mocked(verifySession).mockImplementation(async () => {
      order.push("verify")
      return sessionResponse()
    })

    renderCallback("")

    await expectLocation("/inicio")
    expect(order).toEqual(["verify", "csrf", "hydrate"])
    expect(fetchCsrfToken).not.toHaveBeenCalled()
    expect(useCSRFStore.getState().token).toBe("csrf-from-verify")
    expect(useAuthStore.getState()).toMatchObject({
      userId: "user-1",
      role: "tecnico",
      tenantId: "tenant-1",
      isAuthenticated: true,
      isAuthResolved: true,
      accessMode: "full",
    })
    expect(useAuthStore.getState().token).toBeNull()
  })

  it("fetches the CSRF token through the store when verification returns none", async () => {
    vi.mocked(verifySession).mockImplementation(async () => {
      order.push("verify")
      return { user: { _id: "user-1", userName: "tec", role: "tecnico", tenantId: "tenant-1" } }
    })
    vi.mocked(fetchCsrfToken).mockImplementation(async () => {
      order.push("csrf-fetch")
      return { token: "csrf-fetched" }
    })

    renderCallback("")

    await expectLocation("/inicio")
    expect(fetchCsrfToken).toHaveBeenCalledTimes(1)
    expect(order.indexOf("csrf")).toBeGreaterThan(order.indexOf("verify"))
    expect(order.indexOf("hydrate")).toBeGreaterThan(order.indexOf("csrf"))
    expect(useCSRFStore.getState().token).toBe("csrf-fetched")
  })

  it("clears the durable logout epoch only after session and CSRF are verified", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback("")

    await expectLocation("/inicio")
    expect(localStorage.getItem("logout-epoch")).toBeNull()
  })

  it("runs the verification once even when React mounts the effect twice", async () => {
    vi.mocked(verifySession).mockResolvedValue({
      ...sessionResponse(),
      csrfToken: undefined,
    })
    vi.mocked(fetchCsrfToken).mockResolvedValue({ token: "csrf-fetched" })

    renderCallback("", { strictMode: true })

    await expectLocation("/inicio")
    expect(verifySession).toHaveBeenCalledTimes(1)
    expect(fetchCsrfToken).toHaveBeenCalledTimes(1)
  })
})

describe("oauth callback fail-closed paths", () => {
  it("keeps the durable logout epoch and never hydrates when session verification fails", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockRejectedValue(new Error("Sesión no válida"))

    renderCallback("?returnTo=%2Fordenes-trabajo")

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "t(auth.oauth.callback.sessionFailed)",
    ))
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(useAuthStore.getState()).toMatchObject({
      userId: null,
      isAuthenticated: false,
      isAuthResolved: true,
    })
    expect(useCSRFStore.getState().token).toBeNull()
    expect(fetchCsrfToken).not.toHaveBeenCalled()
    expect(navigations).toEqual([])
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("keeps the durable logout epoch and never hydrates when CSRF hydration fails", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockResolvedValue({
      user: { _id: "user-1", userName: "tec", role: "tecnico", tenantId: "tenant-1" },
    })
    vi.mocked(fetchCsrfToken).mockRejectedValue(new Error("CSRF unavailable"))

    renderCallback("")

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(order).not.toContain("hydrate")
    expect(useAuthStore.getState()).toMatchObject({ userId: null, isAuthenticated: false })
    expect(useCSRFStore.getState().token).toBeNull()
    expect(navigations).toEqual([])
  })

  it("fails closed when the CSRF endpoint returns an empty token", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockResolvedValue({
      user: { _id: "user-1", userName: "tec", role: "tecnico", tenantId: "tenant-1" },
    })
    vi.mocked(fetchCsrfToken).mockResolvedValue({ token: "" })

    renderCallback("")

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(order).not.toContain("hydrate")
    expect(useCSRFStore.getState().token).toBeNull()
    expect(navigations).toEqual([])
  })

  it("refuses a verified payload without an identity instead of trusting it", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockResolvedValue({ csrfToken: "csrf-from-verify" })

    renderCallback("")

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      "t(auth.oauth.callback.sessionFailed)",
    ))
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(fetchCsrfToken).not.toHaveBeenCalled()
    expect(useCSRFStore.getState().token).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it.each([
    "OAUTH_PROVIDER_DENIED",
    "OAUTH_EXCHANGE_FAILED",
    "OAUTH_ACCOUNT_LINK_REQUIRED",
    "OAUTH_TRANSACTION_EXPIRED",
    "OAUTH_NOT_A_CONTRACT_CODE",
    "Bearer eyJhbGciOi.token",
  ])("reports %s without touching the session, CSRF store, or logout epoch", async (code) => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback(`?oauth_error=${encodeURIComponent(code)}&returnTo=%2Finicio`)

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(verifySession).not.toHaveBeenCalled()
    expect(fetchCsrfToken).not.toHaveBeenCalled()
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(useAuthStore.getState()).toMatchObject({ userId: null, isAuthenticated: false, isAuthResolved: true })
    expect(screen.getByRole("alert").textContent).not.toContain(code)
    expect(document.body.textContent).not.toContain(code)
    expect(navigations).toEqual([])
  })

  it("maps each frozen backPanel code to its own localized copy through the page", async () => {
    const expectations: Array<[string, string]> = [
      ["OAUTH_NOT_CONFIGURED", "notConfigured"],
      ["OAUTH_PROVIDER_NOT_ALLOWED", "providerNotAllowed"],
      ["OAUTH_RETURN_TARGET_INVALID", "returnTargetInvalid"],
      ["OAUTH_TRANSACTION_INVALID", "transactionInvalid"],
      ["OAUTH_TRANSACTION_EXPIRED", "transactionExpired"],
      ["OAUTH_TRANSACTION_STORE_UNAVAILABLE", "transactionStoreUnavailable"],
      ["OAUTH_PROVIDER_DENIED", "providerDenied"],
      ["OAUTH_EXCHANGE_FAILED", "exchangeFailed"],
      ["OAUTH_IDENTITY_REJECTED", "identityRejected"],
      ["OAUTH_ACCOUNT_LINK_REQUIRED", "accountLinkRequired"],
      ["OAUTH_SESSION_UNAVAILABLE", "sessionUnavailable"],
    ]

    for (const [code, leaf] of expectations) {
      const { unmount } = renderCallback(`?oauth_error=${code}`)
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
        `t(auth.oauth.callback.errors.${leaf})`,
      ))
      expect(document.body.textContent).not.toContain(code)
      unmount()
      await new Promise((resolve) => { setTimeout(resolve, 0) })
    }
  })

  it("offers retry and home actions that navigate safely without starting an OAuth flow", async () => {
    localStorage.setItem("logout-epoch", "1700000000000")
    vi.mocked(verifySession).mockRejectedValue(new Error("Sesión no válida"))

    const first = renderCallback("?returnTo=%2Fordenes-trabajo")
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())

    await userEvent.click(screen.getByRole("button", { name: "t(auth.oauth.callback.retry)" }))
    await waitFor(() => expect(first.getByTestId("location").textContent).toBe("/"))
    expect(navigations.at(-1)).toEqual(["/", { replace: true }])
    first.unmount()

    navigations.length = 0
    renderCallback("?returnTo=%2Fordenes-trabajo")
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: "t(auth.oauth.callback.home)" }))
    await expectLocation("/inicio")

    expect(navigations.at(-1)).toEqual(["/inicio", { replace: true }])
    expect(global.fetch).not.toHaveBeenCalled()
    expect(verifySession).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
  })
})

describe("oauth callback query hygiene", () => {
  it("reads only returnTo and oauth_error and leaves provider credential material alone", async () => {
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback(
      "?code=auth-code-material&state=state-value&token=jwt-material&nonce=nonce-value&provider=google&returnTo=%2Fordenes-trabajo",
    )

    await expectLocation("/ordenes-trabajo")
    expect(navigations[0]).toEqual(["/ordenes-trabajo", { replace: true }])
    expect(document.body.textContent).not.toMatch(/auth-code-material|jwt-material|state-value|nonce-value/)

    for (const key of ["auth-storage", "csrf-storage", "logout-epoch"]) {
      const stored = `${localStorage.getItem(key) ?? ""}${sessionStorage.getItem(key) ?? ""}`
      expect(stored).not.toMatch(/auth-code-material|jwt-material|state-value|nonce-value/)
    }
  })

  it.each([
    "?returnTo=%2F%252e%252e%2Fpanel-admin",
    "?returnTo=%252F%252Fevil.test%252Finicio",
    "?returnTo=%2F%2Fevil.test%2Finicio",
    "?returnTo=https%3A%2F%2Fevil.test%2Finicio",
    "?returnTo=%2Fperfil%23fragment",
    "?returnTo=%2F..%2Fpanel-admin",
  ])("never reflects or double-decodes the target of %j", async (search) => {
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback(search)

    await expectLocation("/inicio")
    expect(document.body.textContent).not.toMatch(/evil\.test|%2e|\.\./)
    expect(navigations[0]).toEqual(["/inicio", { replace: true }])
  })

  it("refuses a hand-off that repeats returnTo instead of trusting the first one", async () => {
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback("?returnTo=%2Fordenes-trabajo&returnTo=%2F%2Fevil.test%2Finicio")

    await expectLocation("/inicio")
    expect(document.body.textContent).not.toMatch(/evil\.test|ordenes-trabajo/)
    expect(navigations[0]).toEqual(["/inicio", { replace: true }])
  })

  it("honours the app root as a safe target instead of inventing one", async () => {
    vi.mocked(verifySession).mockResolvedValue(sessionResponse())

    renderCallback("?returnTo=%2F")

    await expectLocation("/")
    expect(navigations[0]).toEqual(["/", { replace: true }])
  })

  it.each(["/auth/callback", "/api/auth/oauth/start%3Fprovider%3Dgoogle", "/api/auth/oauth/callback"])(
    "refuses the OAuth flow target %j instead of looping",
    async (encoded) => {
      vi.mocked(verifySession).mockResolvedValue(sessionResponse())

      renderCallback(`?returnTo=${encoded}`)

      await expectLocation("/inicio")
      const target = String(navigations[0]?.[0])
      expect(target).not.toContain("callback")
      expect(target).not.toContain("oauth")
    },
  )

  it("keeps the session cookie model: no token is ever stored by the callback page", async () => {
    vi.mocked(verifySession).mockResolvedValue({
      ...sessionResponse(),
      token: "jwt-should-never-persist",
    })

    renderCallback("")

    await expectLocation("/inicio")
    const persisted = `${localStorage.getItem("auth-storage") ?? ""}${sessionStorage.getItem("csrf-storage") ?? ""}`
    expect(persisted).not.toMatch(/jwt-should-never-persist/)
    expect(useAuthStore.getState().token).toBeNull()
  })
})

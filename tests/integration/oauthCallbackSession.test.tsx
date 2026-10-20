import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "../../src/i18n"
import es from "../../src/i18n/locales/es.json"
import { useAuthStore } from "../../src/store/authStore"
import { useCSRFStore } from "../../src/store/csrfStore"
import OAuthCallback from "../../src/pages/OAuthCallback"

// Integration: the real login/CSRF services, the real stores, and the real i18n
// pipeline, with only the network boundary stubbed. Nothing here mocks a service
// in order to make the callback look safe.

const calls: string[] = []

const jsonResponse = (body: unknown, init?: ResponseInit) => new Response(
  JSON.stringify(body),
  { status: 200, headers: { "Content-Type": "application/json" }, ...init },
)

const account = { _id: "user-1", userName: "tecnico", role: "tecnico", tenantId: "tenant-1" }

type Fixture = {
  verify?: () => Response
  csrf?: () => Response
}

const stubNetwork = (fixture: Fixture = {}) => {
  calls.length = 0
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)

    if (url.includes("/api/verify")) {
      return fixture.verify
        ? fixture.verify()
        : jsonResponse({ user: account, csrfToken: "csrf-from-verify" })
    }
    if (url.includes("/api/csrf-token")) {
      return fixture.csrf ? fixture.csrf() : jsonResponse({ token: "csrf-fetched" })
    }
    throw new Error(`the OAuth callback must not touch any other endpoint: ${url}`)
  }))
}

function RouteProbe() {
  const location = useLocation()
  return <p data-testid="route">{location.pathname}</p>
}

const renderCallback = (search = "") => render(
  <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
    <RouteProbe />
    <Routes>
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/" element={<p data-testid="target">login</p>} />
      <Route path="/inicio" element={<p data-testid="target">home</p>} />
      <Route path="/ordenes-trabajo" element={<p data-testid="target">orders</p>} />
    </Routes>
  </MemoryRouter>,
)

const expectRoute = async (pathname: string) => {
  await waitFor(() => expect(screen.getByTestId("route").textContent).toBe(pathname))
}

const currentRoute = () => screen.getByTestId("route").textContent

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
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
  await i18n.changeLanguage("es")
})

describe("oauth callback session integration", () => {
  it("verifies the cookie session, hydrates CSRF through the store, then enters the app", async () => {
    stubNetwork({ verify: () => jsonResponse({ user: account }) })
    localStorage.setItem("logout-epoch", "1700000000000")

    renderCallback("?returnTo=%2Fordenes-trabajo")

    await expectRoute("/ordenes-trabajo")
    expect(screen.getByTestId("target")).toHaveTextContent("orders")
    expect(calls).toEqual(["/api/verify", "/api/csrf-token"])
    expect(useCSRFStore.getState().token).toBe("csrf-fetched")
    expect(useAuthStore.getState()).toMatchObject({
      user: "tecnico",
      userId: "user-1",
      role: "tecnico",
      tenantId: "tenant-1",
      isAuthenticated: true,
      isAuthResolved: true,
      accessMode: "full",
    })
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem("logout-epoch")).toBeNull()
  })

  it("reuses the CSRF token carried by the verified session without a second request", async () => {
    stubNetwork({ verify: () => jsonResponse({ user: account, csrfToken: "csrf-from-verify" }) })

    renderCallback("?returnTo=%2Finicio")

    await expectRoute("/inicio")
    expect(calls).toEqual(["/api/verify"])
    expect(useCSRFStore.getState().token).toBe("csrf-from-verify")
    expect(localStorage.getItem("auth-storage")).not.toMatch(/csrf-from-verify|jwt/)
  })

  it("sends the session check with cookies and never a bearer token", async () => {
    stubNetwork({ verify: () => jsonResponse({ user: account }) })

    renderCallback("")

    await expectRoute("/inicio")
    const verifyCall = vi.mocked(global.fetch).mock.calls.find((call) => String(call[0]).includes("/api/verify"))
    expect(verifyCall?.[1]).toMatchObject({ credentials: "include" })
    const headers = new Headers(verifyCall?.[1]?.headers as HeadersInit | undefined)
    expect(headers.get("Authorization")).toBeNull()
    expect(localStorage.getItem("auth-storage")).not.toMatch(/jwt|"token":\s*"[^"]+"/)
  })

  it("fails closed on an unverified session and preserves the durable logout epoch", async () => {
    stubNetwork({
      verify: () => jsonResponse(
        { error: { message: "Sesión no válida", code: "MISSING_AUTH_HEADER" } },
        { status: 401 },
      ),
    })
    localStorage.setItem("logout-epoch", "1700000000000")

    renderCallback("?returnTo=%2Fordenes-trabajo")

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(
      es.auth.oauth.callback.sessionFailed,
    ))
    expect(calls).toEqual(["/api/verify"])
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(useAuthStore.getState()).toMatchObject({
      userId: null,
      isAuthenticated: false,
      isAuthResolved: true,
    })
    expect(useCSRFStore.getState().token).toBeNull()
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(currentRoute()).toBe("/auth/callback")
  })

  it("fails closed when the CSRF service is unavailable and never enters the app", async () => {
    stubNetwork({
      verify: () => jsonResponse({ user: account }),
      csrf: () => jsonResponse({ error: { message: "No se pudo obtener el token CSRF" } }, { status: 503 }),
    })
    localStorage.setItem("logout-epoch", "1700000000000")

    renderCallback("?returnTo=%2Finicio")

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(calls).toEqual(["/api/verify", "/api/csrf-token"])
    expect(useAuthStore.getState()).toMatchObject({ userId: null, isAuthenticated: false })
    expect(localStorage.getItem("logout-epoch")).toBe("1700000000000")
    expect(currentRoute()).toBe("/auth/callback")
  })

  it("refuses a verified payload with no identity instead of authenticating it", async () => {
    stubNetwork({ verify: () => jsonResponse({ csrfToken: "csrf-from-verify" }) })

    renderCallback("?returnTo=%2Finicio")

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    expect(calls).toEqual(["/api/verify"])
    expect(useAuthStore.getState()).toMatchObject({ userId: null, isAuthenticated: false })
    expect(useCSRFStore.getState().token).toBeNull()
    expect(currentRoute()).toBe("/auth/callback")
  })

  it.each([
    ["OAUTH_TRANSACTION_EXPIRED", es.auth.oauth.callback.errors.transactionExpired],
    ["OAUTH_ACCOUNT_LINK_REQUIRED", es.auth.oauth.callback.errors.accountLinkRequired],
    ["OAUTH_SESSION_UNAVAILABLE", es.auth.oauth.callback.errors.sessionUnavailable],
    ["OAUTH_MADE_UP_CODE", es.auth.oauth.callback.errors.unexpected],
    ["", es.auth.oauth.callback.errors.unexpected],
  ])("reports the backPanel code %j with localized copy only", async (code, copy) => {
    stubNetwork()

    renderCallback(`?oauth_error=${encodeURIComponent(code)}&returnTo=%2Fordenes-trabajo`)

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(copy))
    expect(calls).toEqual([])
    expect(currentRoute()).toBe("/auth/callback")
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(document.body.textContent).not.toMatch(/OAUTH_|Made|Bearer|jwt/)
  })

  it("falls back to the active localized home when the return target is unsafe", async () => {
    stubNetwork({ verify: () => jsonResponse({ user: account, csrfToken: "csrf-from-verify" }) })

    renderCallback("?returnTo=%2F%252e%252e%2Fpanel-admin")

    await expectRoute("/inicio")
    expect(document.body.textContent).not.toMatch(/panel-admin|%2e|\.\./)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  OAUTH_PROVIDERS,
  buildOAuthStartUrl,
  isSafeAppReturnTarget,
  isSafeRelativeReturnPath,
  resolveSameOriginApiPath,
  startOAuthLogin,
} from "../../../../src/features/auth/services/oauthServices"

// The backPanel browser contract is frozen: frontGMAO may only perform a
// top-level navigation to a same-origin path and must never touch Auth0
// material, store transaction state, or fetch the start endpoint.

describe("oauth start — frozen backPanel contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("offers exactly the two backPanel browser providers", () => {
    expect([...OAUTH_PROVIDERS].sort()).toEqual(["google", "microsoft"])
  })

  it.each([
    ["google", "/api/auth/oauth/start?provider=google&returnTo=%2Finicio"],
    ["microsoft", "/api/auth/oauth/start?provider=microsoft&returnTo=%2Finicio"],
  ])("builds one same-origin start URL for %s", (provider, expected) => {
    expect(buildOAuthStartUrl(provider, "/inicio")).toBe(expected)
  })

  it("encodes the return target exactly once", () => {
    const url = buildOAuthStartUrl("google", "/ordenes-trabajo")
    expect(url).toContain("returnTo=%2Fordenes-trabajo")
    expect(new URL(url, "http://localhost:3000").searchParams.get("returnTo")).toBe("/ordenes-trabajo")
  })

  it.each([
    "/inicio",
    "/ordenes-trabajo",
    "/instalaciones/abc123",
    "/configuracion?tab=cuentas",
  ])("accepts the localized app path %j", (returnTo) => {
    expect(isSafeRelativeReturnPath(returnTo)).toBe(true)
    expect(isSafeAppReturnTarget(returnTo)).toBe(true)
  })

  it.each([
    "https://evil.test/inicio",
    "//evil.test/inicio",
    "/ordenes-trabajo/../admin",
    "/perfil#token",
    "/user\\profile",
    "/ruta\u0000insegura",
    "/ruta\u0001insegura",
    "/%2e%2e/admin",
    "/%2F%2Fevil.test",
    `/inicio?x=${"a".repeat(600)}`,
    "",
    "inicio",
  ])("refuses the unsafe return target %j", (returnTo) => {
    expect(isSafeRelativeReturnPath(returnTo)).toBe(false)
    expect(isSafeAppReturnTarget(returnTo)).toBe(false)
  })

  it("refuses to send the OAuth flow itself as a return target", () => {
    // Shape-safe but loop-bearing: backPanel would hand us back our own page.
    expect(isSafeRelativeReturnPath("/auth/callback")).toBe(true)
    expect(isSafeAppReturnTarget("/auth/callback")).toBe(false)
    expect(isSafeAppReturnTarget("/api/auth/oauth/start?provider=google")).toBe(false)
  })

  it.each([
    "https://evil.test/inicio",
    "/ordenes-trabajo/../admin",
    "/perfil#token",
    "%2F%2Fevil.test",
    "/auth/callback",
    null,
    undefined,
    42,
  ])("falls back to the app root for the unsafe target %j instead of forwarding it", (returnTo) => {
    expect(buildOAuthStartUrl("google", returnTo)).toBe(
      "/api/auth/oauth/start?provider=google&returnTo=%2F",
    )
  })

  it.each([[null], [undefined], ["auth0"], ["GOOGLE"], [""], [42], [{ provider: "google" }]])(
    "refuses the provider %j instead of forwarding it to backPanel",
    (provider) => {
      expect(buildOAuthStartUrl(provider, "/inicio")).toBeNull()
    },
  )

  it("never leaves the app origin whatever the API base looks like", () => {
    expect(resolveSameOriginApiPath("/api/")).toBe("/api/")
    expect(resolveSameOriginApiPath("api/")).toBe("/api/")
    expect(resolveSameOriginApiPath("https://api.backpanel.test/api/")).toBe("/api/")
    expect(resolveSameOriginApiPath("//mirror.test/api/")).toBe("/api/")
    expect(resolveSameOriginApiPath("http://localhost:3000")).toBe("/api/")
    expect(resolveSameOriginApiPath("https://evil.test/api/../")).toBe("/api/")

    const url = buildOAuthStartUrl("google", "/inicio")
    expect(url).not.toBeNull()
    expect(url?.startsWith("/")).toBe(true)
    expect(url).not.toContain("://")
  })

  it("navigates the top-level window once and never fetches", () => {
    const assign = vi.fn()

    expect(startOAuthLogin({ provider: "google", returnTo: "/inicio", assign })).toBe(true)
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith("/api/auth/oauth/start?provider=google&returnTo=%2Finicio")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("does not navigate when backPanel would refuse the request", () => {
    const assign = vi.fn()

    expect(startOAuthLogin({ provider: "facebook", returnTo: "/inicio", assign })).toBe(false)
    expect(assign).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("keeps OAuth transaction state out of web storage", () => {
    startOAuthLogin({ provider: "microsoft", returnTo: "/inicio", assign: vi.fn() })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})

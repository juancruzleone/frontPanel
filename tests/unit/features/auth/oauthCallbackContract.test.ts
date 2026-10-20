import { describe, expect, it } from "vitest"
import ar from "../../../../src/i18n/locales/ar.json"
import de from "../../../../src/i18n/locales/de.json"
import en from "../../../../src/i18n/locales/en.json"
import es from "../../../../src/i18n/locales/es.json"
import fr from "../../../../src/i18n/locales/fr.json"
import italian from "../../../../src/i18n/locales/it.json"
import ja from "../../../../src/i18n/locales/ja.json"
import ko from "../../../../src/i18n/locales/ko.json"
import pt from "../../../../src/i18n/locales/pt.json"
import zh from "../../../../src/i18n/locales/zh.json"
import {
  OAUTH_CALLBACK_PATH,
  OAUTH_ERROR_CODES,
  isOAuthCallbackPath,
  readOAuthCallbackQuery,
  resolveCallbackReturnTarget,
  resolveOAuthErrorMessageKey,
} from "../../../../src/features/auth/services/oauthServices"

// backPanel's browser contract for the callback hand-off is frozen: it returns
// exactly one of `returnTo` or `oauth_error`, the error values are stable and
// non-sensitive, and nothing else may cross that boundary. frontGMAO must read
// only those two values, decode `returnTo` once (the router decodes again would
// re-open traversal), and never reflect a rejected value anywhere.

const locales = { ar, de, en, es, fr, it: italian, ja, ko, pt, zh }

const FROZEN_BACKEND_CODES = [
  "OAUTH_NOT_CONFIGURED",
  "OAUTH_PROVIDER_NOT_ALLOWED",
  "OAUTH_RETURN_TARGET_INVALID",
  "OAUTH_TRANSACTION_INVALID",
  "OAUTH_TRANSACTION_EXPIRED",
  "OAUTH_TRANSACTION_STORE_UNAVAILABLE",
  "OAUTH_PROVIDER_DENIED",
  "OAUTH_EXCHANGE_FAILED",
  "OAUTH_IDENTITY_REJECTED",
  "OAUTH_ACCOUNT_LINK_REQUIRED",
  "OAUTH_SESSION_UNAVAILABLE",
]

describe("oauth callback query contract", () => {
  it("keeps the frozen backPanel error list exactly", () => {
    expect([...OAUTH_ERROR_CODES].sort()).toEqual([...FROZEN_BACKEND_CODES].sort())
  })

  it("reads only the two contract values and ignores provider material", () => {
    const query = readOAuthCallbackQuery(
      "?returnTo=%2Forden-trabajo&code=auth-code&state=state-value&token=jwt&nonce=nonce-value&provider=google",
    )

    expect(Object.keys(query).sort()).toEqual(["errorCode", "returnTo"])
    expect(query).toEqual({ returnTo: "/orden-trabajo", errorCode: null })
  })

  it.each([
    "?code=auth-code&state=state-value&token=jwt&nonce=nonce-value&provider=google",
    "",
    "?returnTo=",
    "?oauth_error=",
  ])("survives the odd query %j without throwing", (search) => {
    expect(() => readOAuthCallbackQuery(search)).not.toThrow()
    const query = readOAuthCallbackQuery(search)
    expect(Object.keys(query).sort()).toEqual(["errorCode", "returnTo"])
  })

  it("decodes returnTo exactly once instead of pre-decoding a traversal", () => {
    // %252e decodes once to the literal %2e, so a second decode is the router's
    // business only: the reader must hand over the single-decoded value.
    expect(readOAuthCallbackQuery("?returnTo=%2F%252e%252e%2Fadmin").returnTo).toBe("/%2e%2e/admin")
    expect(readOAuthCallbackQuery("?returnTo=%252F%252Fevil.test").returnTo).toBe("%2F%2Fevil.test")
    expect(readOAuthCallbackQuery("?returnTo=%2Finicio").returnTo).toBe("/inicio")
  })

  it("reports a present oauth_error even when it is empty", () => {
    expect(readOAuthCallbackQuery("?oauth_error=OAUTH_EXCHANGE_FAILED").errorCode).toBe("OAUTH_EXCHANGE_FAILED")
    expect(readOAuthCallbackQuery("?oauth_error=").errorCode).toBe("")
    expect(readOAuthCallbackQuery("?returnTo=%2Finicio").errorCode).toBeNull()
  })

  it("refuses an ambiguous hand-off that repeats a parameter", () => {
    // First-wins would let a second, hostile returnTo hide behind a safe one.
    expect(readOAuthCallbackQuery("?returnTo=%2Finicio&returnTo=%2F%2Fevil.test")).toEqual({
      returnTo: null,
      errorCode: null,
    })
    expect(readOAuthCallbackQuery("?oauth_error=OAUTH_EXCHANGE_FAILED&oauth_error=").errorCode).toBe("")
    expect(resolveOAuthErrorMessageKey("")).toBe("auth.oauth.callback.errors.unexpected")
  })

  it("accepts non-string search input without trusting it", () => {
    expect(readOAuthCallbackQuery(undefined as unknown as string)).toEqual({ returnTo: null, errorCode: null })
    expect(readOAuthCallbackQuery(42 as unknown as string)).toEqual({ returnTo: null, errorCode: null })
  })
})

describe("oauth callback return target", () => {
  it("keeps a safe localized app target", () => {
    expect(resolveCallbackReturnTarget("/ordenes-trabajo", "/inicio")).toBe("/ordenes-trabajo")
    expect(resolveCallbackReturnTarget("/instalaciones/abc123", "/inicio")).toBe("/instalaciones/abc123")
    expect(resolveCallbackReturnTarget("/configuracion?tab=cuentas", "/inicio")).toBe("/configuracion?tab=cuentas")
  })

  it.each([
    "//evil.test/inicio",
    "https://evil.test/inicio",
    "/ordenes-trabajo/../panel-admin",
    "/%2e%2e/admin",
    "%2F%2Fevil.test",
    "/perfil#fragment",
    "/user\\profile",
    "/ruta\u0000insegura",
    "",
    null,
    undefined,
    42,
    { returnTo: "/inicio" },
  ])("refuses the unsafe target %j and falls back to the localized home", (returnTo) => {
    const resolved = resolveCallbackReturnTarget(returnTo, "/inicio")
    expect(resolved).toBe("/inicio")
    expect(resolved).not.toBe(returnTo)
  })

  it.each([
    "/auth/callback",
    "/AUTH/CALLBACK",
    "/api/auth/oauth/start?provider=google",
    "/api/auth/oauth/callback",
  ])("refuses %j as a target because it would loop the OAuth flow", (returnTo) => {
    expect(resolveCallbackReturnTarget(returnTo, "/inicio")).toBe("/inicio")
  })

  it("falls back to the app root when the localized home itself is unusable", () => {
    expect(resolveCallbackReturnTarget("/..%2f", "//evil.test")).toBe("/")
    expect(resolveCallbackReturnTarget(null, null)).toBe("/")
    expect(resolveCallbackReturnTarget("/inicio", 7)).toBe("/inicio")
  })
})

describe("oauth callback error copy", () => {
  it("maps each frozen backPanel code to its own localized key", () => {
    const keys = FROZEN_BACKEND_CODES.map((code) => resolveOAuthErrorMessageKey(code))

    expect(new Set(keys).size).toBe(FROZEN_BACKEND_CODES.length)
    keys.forEach((key) => {
      expect(key.startsWith("auth.oauth.callback.errors.")).toBe(true)
      expect(key).not.toContain("undefined")
    })
  })

  it.each([
    "OAUTH_NOT_A_CONTRACT_CODE",
    "oauth_exchange_failed",
    "",
    "Bearer eyJhbGciOi.token",
    "<script>alert(1)</script>",
    "OAUTH_SESSION_UNAVAILABLE%20redirect",
    null,
    undefined,
    42,
    { code: "OAUTH_EXCHANGE_FAILED" },
  ])("gives the unknown value %j one generic message and never echoes it", (code) => {
    const key = resolveOAuthErrorMessageKey(code)

    expect(key).toBe("auth.oauth.callback.errors.unexpected")
    if (typeof code === "string" && code.length > 0) expect(key).not.toContain(code)
  })

  it("does not map a code through a case-insensitive or partial match", () => {
    expect(resolveOAuthErrorMessageKey("OAUTH_TRANSACTION_EXPIREDLAPSE")).toBe(
      "auth.oauth.callback.errors.unexpected",
    )
    expect(resolveOAuthErrorMessageKey("EXPIRED")).toBe("auth.oauth.callback.errors.unexpected")
  })
})

describe("oauth callback route identity", () => {
  it("recognizes only the front callback route for bootstrap suppression", () => {
    expect(OAUTH_CALLBACK_PATH).toBe("/auth/callback")
    expect(isOAuthCallbackPath("/auth/callback")).toBe(true)
    expect(isOAuthCallbackPath("/auth/callback/")).toBe(true)
    expect(isOAuthCallbackPath("/inicio")).toBe(false)
    expect(isOAuthCallbackPath("/auth/callback/extra")).toBe(false)
    expect(isOAuthCallbackPath("/api/auth/oauth/callback")).toBe(false)
    expect(isOAuthCallbackPath(null)).toBe(false)
    expect(isOAuthCallbackPath(undefined)).toBe(false)
  })
})

describe("oauth callback translations", () => {
  it.each(Object.entries(locales))("proves every callback string in %s", (_locale, messages) => {
    const callback = messages.auth?.oauth?.callback
    expect(callback).toBeTruthy()
    for (const key of ["title", "verifying", "retry", "home", "sessionFailed"]) {
      expect(callback?.[key as "title"]).toBeTruthy()
    }
    expect(callback?.errors?.unexpected).toBeTruthy()
  })

  it.each(Object.entries(locales))(
    "gives every frozen backPanel code its own copy in %s",
    (_locale, messages) => {
      const callback = messages.auth.oauth.callback
      const values = FROZEN_BACKEND_CODES.map((code) => {
        const leaf = resolveOAuthErrorMessageKey(code).split(".").pop() as string
        expect(leaf).not.toBe("unexpected")
        return callback.errors[leaf as "unexpected"]
      })

      values.forEach((value) => expect(value).toBeTruthy())
      expect(new Set(values).size).toBe(FROZEN_BACKEND_CODES.length)
    },
  )

  it.each(Object.entries(locales))(
    "keeps the generic callback copy distinct from the mapped ones in %s",
    (_locale, messages) => {
      const callback = messages.auth.oauth.callback
      const mapped = FROZEN_BACKEND_CODES.map((code) => {
        const leaf = resolveOAuthErrorMessageKey(code).split(".").pop() as string
        return callback.errors[leaf as "unexpected"]
      })

      expect(mapped).not.toContain(callback.errors.unexpected)
    },
  )

  it.each(Object.entries(locales))(
    "never interpolates a backend value into the callback copy in %s",
    (_locale, messages) => {
      const callback = messages.auth.oauth.callback
      const all = [callback.title, callback.verifying, callback.retry, callback.home, callback.sessionFailed,
        ...Object.values(callback.errors)]

      all.forEach((value) => {
        expect(value).not.toContain("{{")
        expect(value).not.toMatch(/OAUTH_[A-Z_]+/)
      })
    },
  )
})

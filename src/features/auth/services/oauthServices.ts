// backPanel owns the whole OAuth transaction: Auth0 secrets, PKCE, state,
// tokens, verification and the session cookies. frontGMAO contributes exactly
// one thing here — a top-level browser navigation to a same-origin endpoint —
// so nothing in this module may fetch, store, or read credential material.

export type OAuthProvider = "google" | "microsoft"

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ["google", "microsoft"]

/** Path of the backPanel start endpoint, relative to the API base. */
export const OAUTH_START_PATH = "auth/oauth/start"

/** frontGMAO route backPanel redirects back to once the session cookie exists. */
export const OAUTH_CALLBACK_PATH = "/auth/callback"

const API_URL = import.meta.env.VITE_API_URL || "/api/"
const DEFAULT_API_BASE = "/api/"
const DEFAULT_RETURN_TARGET = "/"

// Mirrors the frozen backPanel validator (config/auth0.config.js): the same
// length caps, the same relative-shape rules, and the same repeated-decode
// check that refuses a value which only becomes a traversal after decoding.
const MAX_RETURN_TARGET_LENGTH = 512
const MAX_RETURN_DECODE_PASSES = 3
const UNSAFE_PATH_CHARACTERS = /[\\\u0000-\u001f\u007f#]/
const OAUTH_FLOW_PATH = /(auth\/callback|oauth\/(start|callback))/

const isRelativeShape = (value: string): boolean => (
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("//") &&
  !value.includes("..") &&
  !value.includes("://") &&
  !UNSAFE_PATH_CHARACTERS.test(value)
)

/**
 * Shape check only. A validated value is never decoded for use: the browser and
 * the router decode once on navigation, so a second decode would re-open the
 * traversal hole this check exists to close.
 */
export const isSafeRelativeReturnPath = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_RETURN_TARGET_LENGTH) {
    return false
  }
  if (!isRelativeShape(value)) return false

  let current = value
  for (let pass = 0; pass < MAX_RETURN_DECODE_PASSES; pass += 1) {
    let decoded: string
    try {
      decoded = decodeURIComponent(current)
    } catch {
      return false
    }
    if (decoded === current) return true
    if (!isRelativeShape(decoded)) return false
    current = decoded
  }
  return false
}

/**
 * A return target must also not be the OAuth flow itself: backPanel would hand
 * the browser back to our callback page and the login would never terminate.
 */
export const isSafeAppReturnTarget = (value: unknown): value is string => (
  isSafeRelativeReturnPath(value) && !OAUTH_FLOW_PATH.test(value.split("?")[0].toLowerCase())
)

/**
 * Keeps OAuth on the deployed same-origin `/api` proxy. Other API base shapes
 * are valid for fetch clients, but top-level navigation to them would bypass
 * the Vercel/Netlify proxy and land on the SPA shell instead of backPanel.
 */
export const resolveSameOriginApiPath = (value: string): string => {
  let path = value
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith("//")) {
    return DEFAULT_API_BASE
  }
  if (!path.startsWith("/")) path = `/${path}`
  if (path.includes("..") || (path !== "/api" && !path.startsWith("/api/"))) {
    return DEFAULT_API_BASE
  }
  return path.endsWith("/") ? path : `${path}/`
}

export const buildOAuthStartUrl = (provider: unknown, returnTo: unknown): string | null => {
  if (typeof provider !== "string" || !OAUTH_PROVIDERS.includes(provider as OAuthProvider)) {
    return null
  }
  const target = isSafeAppReturnTarget(returnTo) ? returnTo : DEFAULT_RETURN_TARGET
  const base = resolveSameOriginApiPath(API_URL)

  return `${base}${OAUTH_START_PATH}?provider=${encodeURIComponent(provider)}&returnTo=${encodeURIComponent(target)}`
}

/**
 * The front route backPanel hands the browser back to. The only values that may
 * be read out of it are `returnTo` and `oauth_error`.
 */
export const OAUTH_CALLBACK_QUERY_RETURN_PARAM = "returnTo"
export const OAUTH_CALLBACK_QUERY_ERROR_PARAM = "oauth_error"

/**
 * Frozen, non-sensitive failure codes published by backPanel. Anything outside
 * this list is an unknown value: the callback never echoes it, never parses it,
 * and answers with one generic localized message.
 */
export const OAUTH_ERROR_CODES = [
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
] as const

export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number]

/** One distinct localized message key per frozen code, plus one generic key. */
const OAUTH_ERROR_MESSAGE_KEYS: Record<OAuthErrorCode, string> = {
  OAUTH_NOT_CONFIGURED: "auth.oauth.callback.errors.notConfigured",
  OAUTH_PROVIDER_NOT_ALLOWED: "auth.oauth.callback.errors.providerNotAllowed",
  OAUTH_RETURN_TARGET_INVALID: "auth.oauth.callback.errors.returnTargetInvalid",
  OAUTH_TRANSACTION_INVALID: "auth.oauth.callback.errors.transactionInvalid",
  OAUTH_TRANSACTION_EXPIRED: "auth.oauth.callback.errors.transactionExpired",
  OAUTH_TRANSACTION_STORE_UNAVAILABLE: "auth.oauth.callback.errors.transactionStoreUnavailable",
  OAUTH_PROVIDER_DENIED: "auth.oauth.callback.errors.providerDenied",
  OAUTH_EXCHANGE_FAILED: "auth.oauth.callback.errors.exchangeFailed",
  OAUTH_IDENTITY_REJECTED: "auth.oauth.callback.errors.identityRejected",
  OAUTH_ACCOUNT_LINK_REQUIRED: "auth.oauth.callback.errors.accountLinkRequired",
  OAUTH_SESSION_UNAVAILABLE: "auth.oauth.callback.errors.sessionUnavailable",
}

export const OAUTH_ERROR_GENERIC_MESSAGE_KEY = "auth.oauth.callback.errors.unexpected"

// Exact-match lookup on a frozen table: no case folding, no prefix matching, and
// nothing from the query is ever interpolated into a message or a DOM node.
const OAUTH_ERROR_MESSAGE_BY_CODE = new Map<string, string>(Object.entries(OAUTH_ERROR_MESSAGE_KEYS))

export const resolveOAuthErrorMessageKey = (code: unknown): string => {
  if (typeof code !== "string") return OAUTH_ERROR_GENERIC_MESSAGE_KEY

  return OAUTH_ERROR_MESSAGE_BY_CODE.get(code) ?? OAUTH_ERROR_GENERIC_MESSAGE_KEY
}

export interface OAuthCallbackQuery {
  returnTo: string | null
  errorCode: string | null
}

/**
 * Reads the callback hand-off. URLSearchParams decodes once — exactly what the
 * browser already did to the URL — and the values are handed over untouched: a
 * second decode here would turn `%252e%252e` back into a traversal. `code`,
 * `state`, `token`, `nonce`, and `provider` are not read at all because none of
 * them belong to frontGMAO: backPanel owns the whole transaction.
 *
 * A parameter repeated in the same hand-off is ambiguous, and an ambiguous
 * hand-off is not a trustworthy one: a repeated target is dropped, and a
 * repeated error flag is reported as an unusable error so the page fails closed.
 */
export const readOAuthCallbackQuery = (search: unknown): OAuthCallbackQuery => {
  const raw = typeof search === "string" ? search.replace(/^\?/, "") : ""

  try {
    const params = new URLSearchParams(raw)
    const returnValues = params.getAll(OAUTH_CALLBACK_QUERY_RETURN_PARAM)
    const errorValues = params.getAll(OAUTH_CALLBACK_QUERY_ERROR_PARAM)

    return {
      returnTo: returnValues.length === 1 ? returnValues[0] : null,
      errorCode: errorValues.length > 1 ? "" : errorValues[0] ?? null,
    }
  } catch {
    return { returnTo: null, errorCode: null }
  }
}

/**
 * The only target the callback may navigate to: the value backPanel sent when it
 * is safe, otherwise the localized home the app is serving, otherwise the root.
 * A rejected value is dropped rather than reflected.
 */
export const resolveCallbackReturnTarget = (returnTo: unknown, localizedHome: unknown): string => {
  if (isSafeAppReturnTarget(returnTo)) return returnTo
  if (isSafeAppReturnTarget(localizedHome)) return localizedHome

  return DEFAULT_RETURN_TARGET
}

/** True while the document is on the front callback route itself. */
export const isOAuthCallbackPath = (pathname: unknown): boolean => (
  typeof pathname === "string" &&
  (pathname.toLowerCase().replace(/\/+$/, "") || "/") === OAUTH_CALLBACK_PATH
)

export type TopLevelNavigator = (url: string) => void

const navigateTopLevel: TopLevelNavigator = (url) => {
  window.location.assign(url)
}

export interface OAuthStartRequest {
  provider: unknown
  returnTo: unknown
  assign?: TopLevelNavigator
}

/**
 * Starts the provider login as a browser navigation. A fetch would run the OAuth
 * redirect chain inside the SPA, expose the flow to page scripts, and never set
 * the top-level document to the provider, so the caller gets `false` back when
 * backPanel would refuse the request and no navigation happens at all.
 */
export const startOAuthLogin = ({ provider, returnTo, assign = navigateTopLevel }: OAuthStartRequest): boolean => {
  const url = buildOAuthStartUrl(provider, returnTo)
  if (!url) return false

  assign(url)
  return true
}

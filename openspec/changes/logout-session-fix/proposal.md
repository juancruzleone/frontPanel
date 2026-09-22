# Proposal: logout-session-fix — "cierro sesión, recargo y vuelve"

**Change:** `logout-session-fix`  
**Mode:** auto | **Store:** engram (hybrid file fallback) | **Delivery:** ask-on-risk (800 lines)  
**Roots:** `frontGMAO` (primary, React 19 + Zustand) + `backPanel` (Node 24 + Express cookies)  
**Date:** 2026-09-02 | **Author:** SDD init executor

## 0. Skill resolution

- `.atl/skill-registry.md` present in both repos (last update 2026-09-02, 13 skills).
- No SDD-phase skill paths injected by parent; init runs standalone per contract §Skill Resolution.
- `skill_resolution: none` — parent should inject indexed paths next time for phase skills (proposal/spec/design).

## 1. Summary

Logout visually succeeds (navigate to `/`, `logoutMessage` set) but a hard reload re-hydrates an authenticated session. The bug spans both repos: cookies not reliably cleared, server tokens not revoked when logout hits an expired access token, and frontend bootstrap re-authenticates via stale `localStorage`/`refresh` state.

Fix is **strictly scoped** to making logout durable across reload/offline/expired-token paths without widening to unrelated auth refactors.

## 2. Stack & testing detected (do not revisit without cause)

### frontGMAO (`/home/jleone/work/frontGMAO`)
- **Runtime:** `bun 1.3.5`, `node >=24`, `type: module`, `packageManager bun@1.3.5`
- **App:** `react 19.2.8`, `react-dom 19.2.8`, `react-router 8.3.0`, `vite 8.1.5`, `@vitejs/plugin-react 6.0.4`, `zustand 5.0.14`
- **Scripts:** `dev` (vite), `build`, `lint` (eslint 9.39.4), `type-check` (tsc --noEmit), `test` / `test:unit` / `test:integration` / `test:security` (vitest), `test:e2e` (playwright 1.62), `test:coverage` (v8)
- **Vitest:** `vitest 4.1.10`, config `vitest.config.ts` — `globals`, `jsdom`, `setupFiles ./tests/setup.ts`, `coverage v8 80% thresholds`, `include tests/**/*.{test,spec}.{ts,tsx}`, `exclude tests/e2e/**`, 10s timeouts
- **Setup mock:** `localStorage`/`sessionStorage` mock, `indexedDB` mock, `matchMedia`, `IntersectionObserver`/`ResizeObserver`
- **Lint/type:** `eslint.config.js`, `tsconfig.json` — `bun run lint`, `bun run type-check` gate CI
- **PWA/offline:** `sw.js`, `SERVICE_WORKER_URL`, `offlineTrustStore` (localStorage), `OfflineSyncManager`, `useOfflineStore` (dev exposed)
- **Config file created:** `openspec/config.yaml` (was missing) — now present

### backPanel (`/home/jleone/work/backPanel`)
- **Runtime:** `node >=24 <25`, `bun 1.3.5`, `express 5.2.1`, `mongodb 7.5.0 / mongoose 9.9.1`, `jsonwebtoken 9.0.3`, `helmet 8.3`, `express-rate-limit 8.6`, `cookie via res.cookie/clearCookie`
- **Existing SDD config:** `openspec/config.yaml` present (`backpanel-ci-cd-fix`, review 800, strict_tdd, engram/auto/ask-on-risk) — **not rewritten**; cross-repo note appended conceptually
- **Vitest:** `vitest 4.1.10`, config `vitest.config.js` — `node` env, `.env.test`, `setupFiles ./tests/setup.js`, timeouts 10s; replica config `vitest.replica.config.js`
- **Coverage:** `v8`, `text/json/json-summary/html`, `bun run test:coverage --maxWorkers=1`
- **Layers:** unit ~46, integration ~13, e2e, security (52 tests), replica, load (k6)
- **Quality:** `node --check **/*.js` lint, `bun audit --audit-level=high`, `scripts/secret-scan.js`, `verify-supply-chain.js`, Trivy pinned SHA

> **Externally reformatted (re-read before editing):** `backPanel/utils/auth-cookie.js` and `backPanel/middleware/security.middleware.js` (+ `services/hetzner.services.js` per stored config). Fresh reads were taken during init.

## 3. Full session-handling audit

### 3.1 Frontend — authStore (`src/store/authStore.ts`)
- **Store:** `zustand` + `persist` (`createJSONStorage(() => localStorage)`), key `auth-storage`. `partialize` persists `user/userId/role/tenantId/permissions/accessMode/trial/billingTenant/billingSessionExpiresAt` — **not** `token`, `isAuthenticated`, `isAuthResolved`.
- **Merge:** on rehydration forces `isAuthenticated:false, isAuthResolved:false` regardless of persisted data — session requires explicit `hydrateSession` after server verify.
- **Login:** `login()` stores user identity but leaves `isAuthenticated:false` until modal close `setAuthenticated(true)`.
- **hydrateSession():** sets `isAuthenticated:true, isAuthResolved:true`, syncs `ownerId` to 9+ stores (`installation`, `workOrder`, `inventory`, `supplier`, `audit`, `home`, `technician`, `settings`, `maintenance`, `compliance`, `notification`). Owner scope = `${tenantId}:${userId}` for `installation`/`compliance`.
- **Logout():** async, clears `csrfStore`, `offlineTrustStore`, purges `offlineDraftsForScope(tenantId,userId)` via dynamic import `shared/offline/lifecycleStart`, clears all cached stores, posts `LOGOUT` to SW controller, then `set({ isAuthenticated:false, ... anonymous })`. **Commented** `clearLegacyAuthStorage()` at bottom.
- **Risk:** `localStorage` persists identity fields even after logout as `null` values; `merge` rehydrates but `bootstrapSession` may still use `userId` from `getState()` before persist flush if reload is immediate. Persist is sync (`localStorage`) but SW/IPC timing adds race.

### 3.2 Frontend — AppProviders bootstrap (`src/AppProviders.tsx`)
- `bootstrapSession` on mount: `setState({isAuthenticated:false, isAuthResolved:false})`, reads `currentState = getState()` capture.
- If `currentState.accessMode === "billing_only"` → `getBillingStatus()` / `promoteBillingSession()` branch; else `verifyCurrentSession()` (deduplicated promise).
- On success: `hydrateSession(response)`; if `role==="admin"` fetch billing context.
- **Catch block (bug-prone):**
  ```ts
  const isNetworkError = !navigator.onLine || err.message.includes('network'|'fetch'|'load failed');
  const latestState = getState();
  setState({
    isAuthenticated: isNetworkError && latestState.accessMode==="full" && Boolean(latestState.userId),
    isAuthResolved: true
  });
  ```
  Offline network errors **re-authenticate** from persisted local state without server round-trip. After a fresh logout `latestState.accessMode` should be `anonymous` so no re-auth, but if logout's localStorage write hasn't committed or bootstrap captured stale `currentState`/`latestState`, it re-enters `full`. Confirmed category: **offline-replay re-entry**.
- Registers `online` listener to re-bootstrap; `cancelled` guard present.

### 3.3 Frontend — Nav logout (`src/shared/components/Nav/Nav.tsx:157`)
- `handleLogout`: `setLogoutMessage`, `csrfToken = useCSRFStore.getState().token`, `logoutSession(csrfToken).catch(()=>null).finally(()=>{ logout(); navigate("/",replace); })`
- Always clears local state even if server logout fails — **good**, but leaves server cookies/tokens alive to re-animate on reload.

### 3.4 Frontend — loginServices (`src/features/auth/services/loginServices.ts`)
- `verifySession()` → `GET ${API_URL}verify` via `fetchWithAuthRetry`; throws `AuthApiError` on !ok.
- `logoutSession(csrfToken)` → `DELETE ${API_URL}cuenta` with `credentials:include`, `X-Requested-With`, `X-CSRF-Token` if present. Uses `parseJsonResponse`.
- `userLogin` → `POST cuenta/login` with `credentials:include`.

### 3.5 Frontend — fetchWithAuthRetry (`src/shared/utils/apiHeaders.ts`)
- Wraps `fetch`, injects `getApiHeaders()` ( `X-Tenant-ID` only for `super_admin`, `X-Requested-With`, CSRF for mutating methods).
- **401 TOKEN_EXPIRED** → `await refreshSession()` then retry once; updates `csrfStore` if `csrfToken` returned.
- **403 CSRF** → `fetchToken()` then retry.
- Clones response before json to preserve body.
- Used by `verifySession` — so an expired access token silently refreshes and `bootstrapSession` succeeds, even after logout if `gmao_refresh` cookie wasn't cleared.

### 3.6 Frontend — authRefreshService (`src/shared/services/authRefreshService.ts`)
- `POST ${API_URL}refresh` with `credentials:include`, `X-Requested-With`. Deduplicated mutex `refreshPromise`. Throws `AuthApiError` on !ok.

### 3.7 Frontend — other state
- `csrfStore` (`sessionStorage`, key `csrf-storage`, `partialize token`), `clearToken()` on logout, `fetchToken()` via `csrfServices`.
- `offlineTrustStore` (`localStorage offline-trust-storage`), cleared on logout.
- `fetchCredentials` installer patches `window.fetch` to add `credentials:include` for `/api/` URLs.
- `installations`/`compliance` stores scoped by `ownerId`.

### 3.8 Backend — auth-cookie (`utils/auth-cookie.js`) — **re-read, externally reformatted**
- `AUTH_COOKIE_NAME=gmao_auth`, `REFRESH_COOKIE_NAME=gmao_refresh`, `SameSite` defaults to `none` (for `cmms.leonix.net.ar → api.leonix.net.ar`), `secure:true`, `httpOnly:true`, `path:"/"`, `domain` from `AUTH_COOKIE_DOMAIN` if set.
- `getAuthCookieOptions()` → `maxAge = (JWT_MAX_AGE_HOURS||72)*3,600,000` (72h), `getRefreshCookieOptions()` → 30d.
- `clearAuthCookie(res)` / `clearRefreshCookie(res)` call `res.clearCookie(name, getXCookieOptions())` — **passes maxAge** which is suspect: `clearCookie` should not carry `maxAge`; Express overrides `expires` to epoch but `maxAge` ambiguity may prevent deletion in some browsers when `SameSite=None` + `Secure` is required. Must be fixed to mirror `path/domain/sameSite/secure` **without** `maxAge`.
- `getAuthTokenFromRequest` prefers `Authorization: Bearer` then cookie header parsing.

### 3.9 Backend — controller (`api/controllers/controller.api.auth.js`)
- `issueSession`: `createTokenPair` → `setAuthCookie` + `setRefreshCookie`, `clearBillingCookie`, generate CSRF bound to `sha256(accessToken)`.
- `login` / `publicLogin` → `issueSession`.
- `refresh`: guards `X-Requested-With===XMLHttpRequest` and `Origin/Referer` allow-list, requires `refreshToken` cookie, calls `tokenService.refreshSession(refreshToken)` with rotation, sets new cookies, returns fresh CSRF.
- **`logout(req,res)`:** if `req.user._id` then `removeTokensByAccountId`; `clearAuthCookie`, `clearRefreshCookie`; 200. Does **not** clear `gmao_billing` cookie. Relies on `validateToken` having populated `req.user`.

### 3.10 Backend — routes (`api/routes/route.api.auth.js`)
- `DELETE /cuenta` → `[csrfProtection, validateToken]` → `logout`. **Critical:** needs valid access token. If access token expired, `validateToken` returns 401 `TOKEN_EXPIRED` and controller never runs — refresh family stays alive.
- `POST /refresh` → `[authLimiter]` (no `csrfProtection` by design) → `refresh`.
- `GET /verify` → `[validateToken]` → `verifyAuth`.
- Billing cookies: `utils/billing-cookie.js` (`gmao_billing`, path `/api/billing`, 15 min, SameSite `none`, Secure).

### 3.11 Backend — token service (`services/token.service.js`)
- `createTokenPair` → shared `familyId`, separate `jti` per token, stores in `tokens` collection with `expiresAt`.
- `refreshSession`: verifies JWT, checks session not `rotatedAt`/`revokedAt` else `REFRESH_REUSE_DETECTED` (deletes all family), checks expiry, validates user `status/active/isVerified/tenant`, atomically `findOneAndUpdate {rotatedAt:{ $exists:false }}` to mark rotated, issues new pair.
- `validateToken`: verifies JWT `type===access`, loads `tokens` collection match `token` + `expiresAt>$now`, loads user, checks `isTenantActive` (trial), returns user or null/throws `TokenExpiredError`.
- `removeTokensByAccountId` → `deleteMany {cuenta_id}`.

### 3.12 Backend — middleware
- `auth.validate.middleware.validateToken`: reads cookie via `getAuthTokenFromRequest`, calls `tokenService.validateToken`, attaches `req.user/req.authToken`, maps `TokenExpiredError→401 TOKEN_EXPIRED`.
- `csrf.middleware.csrfProtection`: skips `GET/HEAD/OPTIONS` and `PUBLIC_AUTH_ROUTES`, requires `X-CSRF-Token`, derives `userId` from `req.user` or by validating `authToken`/`billingToken`, validates via `csrfService.validateToken`. Does **not** delete token (offline replay mode).
- `security.middleware.js`: `xssProtection`, `sqlInjectionProtection` (soft), `pathTraversalProtection`, `sanitizeInput`, `securityHeaders`, `securityLogger` — recently reformatted, read clean.
- `server.js`: `helmet`, `xss/pathTraversal/mongoSanitize`, CORS allow-list (`leonix.net.ar`, `api.leonix.net.ar`, `localhost` dev), `credentials:true`, health checks, rate limiters.

## 4. Root causes —why "cierro sesion, recargo y vuelve"

| # | Cause | Evidence | Severity |
|---|-------|----------|----------|
| C1 | **Clear-cookie option mismatch** — `clearAuthCookie` passes `maxAge` (72h) to `res.clearCookie`; browsers key deletion on `path/domain/secure/sameSite` match — `maxAge` should be omitted and `expires` set to epoch. With `SameSite=None; Secure` a mismatched `Expires/Max-Age` leaves `gmao_auth`/`gmao_refresh` alive after logout. | `utils/auth-cookie.js:93,97` calls `getAuthCookieOptions()` (includes `maxAge`) for `clearCookie`. Billing cookie same pattern. | High |
| C2 | **Logout blocked by expired access token** — `DELETE /cuenta` requires `validateToken`. Expired token → 401 before controller → `removeTokensByAccountId` never runs, refresh family persists. Next reload: `verify` → 401 `TOKEN_EXPIRED` → `fetchWithAuthRetry` calls `refresh` → new tokens minted → session returns. | `route.api.auth.js:DELETE /cuenta [csrf,validateToken]` + `controller.logout` depends on `req.user`. Compare with `refresh` which is unauthenticated by design. | High |
| C3 | **Auto-refresh resurrects zombie session** — `verifySession` uses `fetchWithAuthRetry` which auto-refreshes on `TOKEN_EXPIRED`. After a failed logout, the still-valid `gmao_refresh` cookie silently yields fresh `gmao_auth`, so `AppProviders.bootstrapSession` `hydrateSession` succeeds. | `apiHeaders.ts:fetchWithAuthRetry` 401 branch, `AppProviders.tsx:verifyCurrentSession`. | High |
| C4 | **Offline bootstrap re-auth fallback** — `AppProviders` catch sets `isAuthenticated: isNetworkError && latestState.accessMode==="full" && !!userId`. Captures `latestState` post-logout via `getState()` which may still read hydrated `userId`/`accessMode` if persist flush delayed or network error classification is over-broad (`failed to fetch` matches auth 401 body parsing failures). | `AppProviders.tsx:103-123` | Medium |
| C5 | **Billing cookie not cleared on logout** — `controller.logout` clears only auth+refresh, not `gmao_billing`. Billing-only flow may re-promote. | `controller.api.auth.js:logout` vs `billing-cookie.js:clearBillingCookie`. | Medium |
| C6 | **Frontend always treats server logout failure as success** — `Nav.handleLogout` `.catch(()=>null).finally(()=>{logout(); navigate})` hides server failures, so operator thinks logout worked while server session lives. | `Nav.tsx:171`. Acceptable UX but needs server fix (C2) + idempotent fallback. | Low |
| C7 | **Persist scope leaves user fields in localStorage** — `auth-storage` keeps `user/role/tenantId` until `logout()` overwrites with `null`; if SW or bfcache restores page before write, reload sees stale identity. `merge` correctly resets `isAuthenticated:false` but billing/offline branches read `accessMode`. | `authStore.ts:304-322`. | Low |

## 5. Proposal — what will change (no scope widening)

### In scope (strict)
- **B1 backPanel** — Fix `clearAuthCookie`/`clearRefreshCookie`/`clearBillingCookie` to use deletion-safe options (strip `maxAge`, mirror `path/domain/sameSite/secure/httpOnly`, set `expires` epoch). Re-read both target files before edit per instruction.
- **B2 backPanel** — Make logout durable when access token expired: accept `refreshToken` as fallback in `controller.logout` (or add unauthenticated revocation path) and/or add `DELETE /api/auth/logout` variant that validates `refreshToken` when `accessToken` invalid, then `removeTokensByAccountId` from token payload even if `validateToken` failed. Must not weaken CSRF.
- **B3 backPanel** — Ensure `GET /verify` error mapping does not leak; logout should also clear `gmao_billing` cookie.
- **F1 frontGMAO** — `logoutSession` fallback: if `DELETE /cuenta` returns 401 `TOKEN_EXPIRED`, still attempt refresh-token–based revocation or call dedicated logout endpoint; ensure cookies are requested to clear even on 401.
- **F2 frontGMAO** — Harden `AppProviders.bootstrapSession` error handling: do not re-authenticate from `latestState` when previous operation was explicit logout; distinguish `401 UNAUTHENTICATED/INVALID_TOKEN` (force `anonymous`) from true offline network errors. Optionally clear `localStorage auth-storage` / `sessionStorage csrf-storage` on logout before reload and set a `logout-epoch` guard.
- **F3 frontGMAO** — `authStore.logout` ordering: ensure `localStorage` write completes before `navigate`; consider `persist` `onRehydrateStorage` guard. Keep SW `LOGOUT` message and add `caches.delete` if needed.
- **F4 frontGMAO** — `fetchWithAuthRetry`: do not auto-refresh on verify after explicit logout (check `authStore.isAuthenticated` guard or a short-lived `logoutInProgress` flag).

### Out of scope (explicitly not widening)
- RBAC, tenant isolation, trial/billing promotion logic, offline sync/journal, S3, payments, compliance — untouched.
- No new design tokens, theming, or unrelated route changes.
- No `DISABLE_CSRF` in prod.

## 6. Alternatives considered
- **Idempotent logout without auth:** `POST /api/auth/logout` that reads `gmao_refresh` cookie only, revokes family without needing access token. Preferred for C2; small surface increase but scoped.
- **Client-only clear + short TTL:** Rely only on clearing cookies + localStorage — rejected; server-side token family remains valid per `token.service` and will resurrect via refresh.
- **Service Worker hard reset:** Unregister SW on logout — rejected; too disruptive, offline packages need controlled `lifecycleStart.purge`.

## 7. Risks & mitigations
- **SameSite=None cookie deletion regression** — test in secure context + with `AUTH_COOKIE_DOMAIN` both set/unset. Add unit test asserting `clearCookie` options omit `maxAge` and match `domain/sameSite/secure/path`.
- **Refresh reuse detection false positive** — ensure rotation atomicity not broken; existing `findOneAndUpdate` race guard stays.
- **CSRF bypass** — logout fallback that uses `refreshToken` must still require `X-Requested-With` + `X-CSRF-Token` when present, or be rate-limited (`authLimiter`).
- **800-line review budget** — slice into two PRs if needed: (1) backend cookie+revocation, (2) frontend bootstrap/AppProviders; keep each ≤400 or `size:exception` with ask-on-risk pause.
- **Externally reformatted files** — diff with care; preserve formatting of `auth-cookie.js` and `security.middleware.js`.

## 8. Questions for proposal round (interactive gate — answer before spec)

> Parent requested interactive proposal question round (3–5 business questions) before finalizing. Please confirm/correct:

1. **Expired-token logout expectation:** Should `Cerrar sesión` succeed even if the access token already expired (e.g., tab idle 72h+)? Proposal assumes **yes** — server must revoke via refresh-token fallback. Confirm?
2. **Billing-only sessions:** After logout from an expired trial that put operator in `billing_only`, should billing cookie also be destroyed and operator returned to login (`anonymous`), not `billing_only`? Proposal assumes **yes**.
3. **Offline logout:** If operator clicks logout while offline (`navigator.onLine===false`), should we clear local state immediately and defer server revocation to next online (`navigator.onLine` → replay), rather than blocking? Proposal assumes **optimistic local + deferred revocation**.
4. **Multi-tab:** If one tab logs out, should other open tabs detect and drop session without reload (via `storage` event or `BroadcastChannel`)? Or is reload-required acceptable for v1?
5. **Metric of done:** Is the acceptance criterion literally "after Delete /cuenta 200, a reload hits `GET /verify` 401 and `POST /refresh` 401, and Zustand `isAuthenticated=false` stays false" — correct?

**Assumptions if no reply** (proceed as stated, documented for review):
A1 yes revokes via refresh, A2 billing cookie cleared, A3 optimistic+deferred, A4 reload-required v1, A5 verify+refresh both 401 post-logout.

## 9. Delivery plan
- `ask-on-risk` — if change approaches 800 lines, pause for explicit `size:exception` gate; do not auto-chain.
- Branch: `fix/logout-session-fix` (Conventional Commits, no Co-Authored-By).
- Tests first (strict TDD): add failing tests for C1–C4 before fix (vitest unit/integration + playwright logout-reload journey).
- Verify gate: `bun run lint && bun run type-check && bun run test:unit && bun run test:integration && bun run test:security && bun run test:e2e` (front) + `bun run test` / `test:coverage` (back).

## 10. Acceptance sketch (pre-spec)
- `POST /api/refresh` cannot resurrect a logged-out session (family deleted).
- `clearCookie` `Set-Cookie` headers contain `Expires=Thu, 01 Jan 1970` and no `Max-Age`, with correct `Path/Domain/SameSite=none; Secure`.
- Reload after logout → `GET /api/verify` 401, `isAuthenticated===false`, `isAuthResolved===true`, redirected to login, localStorage `auth-storage` not rehydrating to `full`.
- Offline logout then online verify stays logged out.
- Existing 52 security tests + auth integration tests still pass.

---
*Next phases per SDD: spec → design → tasks → apply (TDD) → verify → archive. Do not start next phase until this proposal is approved.*

# Session Audit — logout-session-fix

**Full code review of session handling — frontGMAO + backPanel**

## Files read (frontGMAO primary)

- `src/store/authStore.ts` — Zustand persist, login/hydrate/logout, ownerId sync, partialize/merge
- `src/AppProviders.tsx` — bootstrapSession, billing_only branch, verifyCurrentSession dedup, network-error fallback
- `src/store/csrfStore.ts` — sessionStorage persist, fetchToken/clearToken
- `src/store/offlineTrustStore.ts` — localStorage offline-trust-storage
- `src/features/auth/services/loginServices.ts` — userLogin, verifySession, logoutSession
- `src/features/auth/hooks/useLogin.ts` — login/enterBillingOnly/setAuthenticated flow
- `src/shared/services/authRefreshService.ts` — refreshSession POST /refresh dedup
- `src/shared/utils/apiHeaders.ts` — fetchWithAuthRetry (401 TOKEN_EXPIRED → refresh → retry, 403 CSRF → fetchToken)
- `src/shared/services/fetchCredentials.ts` — installFetchCredentials patch
- `src/shared/components/Nav/Nav.tsx` — handleLogout (logoutSession + local logout + navigate)
- `src/router/*` + `src/features/billing/*` — billing promotion paths
- `vite.config.ts`, `vitest.config.ts`, `tests/setup.ts`, `package.json`

## Files read (backPanel)

- `utils/auth-cookie.js` — AUTH/REFRESH cookie names, getAuthCookieOptions/clearAuthCookie (externally reformatted — re-read)
- `utils/billing-cookie.js` — gmao_billing, 15min, path /api/billing
- `api/controllers/controller.api.auth.js` — issueSession, login, refresh, logout (removeTokensByAccountId + clear cookies)
- `api/routes/route.api.auth.js` — DELETE /cuenta [csrfProtection, validateToken] → logout
- `services/token.service.js` — createTokenPair, refreshSession rotation, validateToken, removeTokensByAccountId
- `middleware/auth.validate.middleware.js` — validateToken (cookie → JWT verify → tokens collection)
- `middleware/csrf.middleware.js` — X-CSRF-Token + authTokenHash/billingTokenHash binding
- `middleware/security.middleware.js` — xss/pathTraversal/mongoSanitize/securityHeaders (re-read, reformatted)
- `app/server.js` — helmet, cors (credentials:true), health, rate limiters, route mount order
- `tests/unit/auth-cookie.test.js`, `tests/integration/auth.api.test.js` (partial), `vitest.config.js`, `openspec/config.yaml`

## Persisted state inventory

| Key | Storage | Content | Cleared on logout? |
|-----|---------|---------|--------------------|
| `auth-storage` | localStorage front | user/userId/role/tenantId/permissions/accessMode/trial/billingTenant/billingSessionExpiresAt | Yes — set to null/anonymous via persist |
| `csrf-storage` | sessionStorage front | token | Yes — clearToken() |
| `offline-trust-storage` | localStorage front | isOfflineReady/leaseStatus/deviceId/lastVerifiedAt | Yes — clearTrust() |
| `gmao_auth` | httpOnly cookie (SameSite=None; Secure; Path /) | JWT access 72h | clearAuthCookie (bug: maxAge passed) |
| `gmao_refresh` | httpOnly cookie (SameSite=None; Secure; Path /) | JWT refresh 30d family | clearRefreshCookie (same bug) |
| `gmao_billing` | httpOnly cookie Path /api/billing | billing capability 15m | **Not cleared on logout** |
| `tokens` collection | MongoDB | token docs with jti/familyId/expiresAt/rotatedAt | `removeTokensByAccountId` on logout (only if validateToken succeeded) |
| offline drafts/purge | IndexedDB + localStorage via lifecycleStart | per-scope drafts | purgeOfflineDraftsForScope(tenantId:userId) awaited |

## Control flow — reload after logout (bug path)

1. User `handleLogout` → `DELETE /api/cuenta` + local `logout()` (sets anonymous) + `navigate("/")`
2. If `validateToken` failed (expired), server **never** runs `logout` controller → `gmao_refresh` cookie + `tokens` family persist
3. Reload → Zustand `merge` rehydrates `isAuthenticated:false/anonymous` correctly
4. `AppProviders.bootstrapSession` → `GET /api/verify` → 401 TOKEN_EXPIRED → `fetchWithAuthRetry` auto-calls `POST /api/refresh` (refresh cookie still valid) → 200 with new `gmao_auth` + CSRF → `hydrateSession` → `isAuthenticated:true` → "vuelve"
5. Alternatively if offline/network error classification hits, `latestState` re-auth fallback may also re-enter.

## Re-read advisory

`utils/auth-cookie.js` and `middleware/security.middleware.js` were reformatted externally — diffs during apply must be whitespace-aware; re-read both files immediately before editing (done during init, but again before apply). `services/hetzner.services.js` also noted in stored config.

## Test runner detection

- frontGMAO: `vitest 4.1.10 jsdom` + `playwright 1.62` — `bun run test:unit`, `test:integration`, `test:security`, `test:e2e`, `test:coverage`, `lint`, `type-check`
- backPanel: `vitest 4.1.10 node` + `supertest`, `k6` load — `bun run test`, `test:unit`, `test:integration`, `test:e2e`, `test:security`, `test:coverage --maxWorkers=1`

## Decision log (init)

- `frontGMAO/openspec/config.yaml` created (was missing) with engram/auto/ask-on-risk/800.
- `backPanel/openspec/config.yaml` exists (backpanel-ci-cd-fix) — summarized, not overwritten; cross-repo note for logout-session-fix recorded in proposal/SESSION_AUDIT.
- Init stored in hybrid file form (`openspec/changes/logout-session-fix/*`) due to unavailable Engram tool in this session — parent should persist to `engram sdd-init/logout-session-fix` when tool available.

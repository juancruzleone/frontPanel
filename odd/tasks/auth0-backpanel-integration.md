# Auth0 integration with backPanel
Add Auth0 login to frontGMAO without adding a frontend secret or token store.
Use backPanel as the complete OAuth/session authority and preserve the existing cookie-first session model.

## Specs
1. **S1** — "Podrias implementar el sistema de Auth0, tambien en frontPanel?"
2. **S2** — "Pero quiero que funcione 100% con backPanel"
3. **S3** — "quiero que sea lo mas seguro posible."

## Allowed edit surfaces
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/hooks/useSocialLogin.ts`
- `src/features/auth/services/oauthServices.ts`
- `src/pages/OAuthCallback.tsx`
- `src/router/lazyPages.ts`
- `src/router/createTranslatedRouter.tsx`
- `src/store/authStore.ts`
- `src/AppProviders.tsx`
- `src/shared/services/fetchCredentials.ts`
- `src/i18n/locales/*.json`
- `public/sw.js`
- `tests/unit/**/*oauth*.test.ts*`
- `tests/integration/**/*oauth*.test.ts*`
- `tests/e2e/**/*oauth*.spec.ts`
- `odd/tasks/auth0-backpanel-integration.md`

## Tasks
- **FP1** (S1-S3) — COMPLETE. Added RED public-interface tests for provider redirects, safe localized return paths, guard-free callback routing, and non-echoing failure UX. Route: worker. Commits: `943f72c`, `cc697d4`, `cf23341`.
- **FP2** (S1-S3) — COMPLETE. Added social login controls and redirect services that send no credentials or Auth0 tokens through JavaScript storage. Route: worker. Commit: `cc697d4`.
- **FP3** (S2-S3) — COMPLETE. Added verified cookie-session and CSRF hydration, durable logout ordering, safe navigation, bootstrap race suppression, and OAuth service-worker exclusions. Route: worker. Commits: `cf23341`, `da95b4d`.
- **FP4** (S1-S3) — Run focused and full verification, independent security verification, native review when due, commit, validate against backPanel/Coolify, and push. Route: parent + verifier. Commit: pending.

## Log
- **L1** — "Podrias implementar el sistema de Auth0, tambien en frontPanel? Pero quiero que funcione 100% con backPanel, quiero que sea lo mas seguro posible."
- **L2** — User clarified that "frontPanel" means `/home/jleone/work/frontGMAO`.
- **L3** — Existing frontGMAO is a static React/Vite SPA with cookie-first sessions, CSRF hydration, durable logout protection, and no server runtime or Auth0 code.
- **L4** — Selected architecture: frontGMAO performs only top-level navigation and post-callback session hydration; backPanel owns every OAuth secret, transaction, token exchange, verification, and session cookie.
- **L5** — FP2 RED evidence: three new test files failed with 31 missing-module/translation cases before implementation. GREEN evidence: 79 OAuth start/UI/i18n tests, 138 related auth/security tests, 1,352 unit tests, 7 integration tests, type-check, and lint all passed.
- **L6** — Review workload: the complete start-side slice is 615 authored lines because it includes 10-locale UI copy and 324 lines of adversarial public-interface tests. It must not deploy before FP3 because backPanel redirects to a callback route that does not yet exist.
- **L7** — FP3 RED evidence covered 81 missing contract/page cases, 5 route/bootstrap cases, and 5 service-worker cases before implementation. GREEN evidence: 325 focused tests, 1,537 full tests, type-check, and lint passed.
- **L8** — Callback behavior reads only `returnTo` and `oauth_error`, single-decodes through `URLSearchParams`, rejects repeated/unsafe values, verifies cookie identity before CSRF and hydration, preserves the logout epoch on every failure, uses replace navigation, and never lets the service worker cache or shell-fallback OAuth routes.
- **L9** — Review workload: FP3 adds approximately 1,882 authored lines, including 1,299 lines of public/security tests and 290 lines of ten-locale copy. Delivery must use cohesive commits rather than compressing validation coverage.
- **L10** — Independent verification passed S1-S3 with 236 focused, 1,485 unit, 19 integration, 33 security, and 1,537 full tests plus type-check and lint. It found case-variant OAuth path gaps, a non-proxied API-base fallback, and malformed CSRF acceptance.
- **L11** — Corrections observed RED in 5 focused cases, then GREEN in 106 focused cases: callback/bootstrap and service-worker OAuth matching is case-insensitive, OAuth start always falls back to the same-origin `/api/` proxy, and an empty fetched CSRF token fails closed without clearing the logout epoch. Post-correction unit/integration/security suites passed; the combined command timed out after those suites while type-check/lint had already passed independently before the bounded corrections. Post-correction LSP had no errors; a hardcoded-URL warning was removed and the start contract remained 40/40 GREEN.
- **L12** — Delivery strategy: keep one feature branch with cohesive behavior+test commits and never deploy a partial slice. Slice 1 `943f72c` contains the 601-line shared start/callback contract and 373 lines of its adversarial tests. No pull request is requested in this task.
- **L13** — Slice 2 `cc697d4` contains the 587-line localized provider controls, hook, all ten locale blocks, and their public UI/parity tests.
- **L14** — Slice 3 `cf23341` contains the cohesive 989-line callback verification/CSRF/session/router behavior and 819 lines of page, route, bootstrap, and integration tests; separating those tests would make the security ordering unverifiable.
- **L15** — Slice 4 `da95b4d` contains the 293-line network-only OAuth service-worker behavior and independent cache/shell/offline tests.
- **L16** — FP4 remains open for build/browser/live-contract verification, external Auth0/Coolify configuration, final task closure, and pushing both feature branches.

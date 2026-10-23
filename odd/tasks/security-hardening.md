# Feature: Security Hardening & Vulnerability Remediation

## Specs
S1: Align `vercel.json` security headers with `public/_headers` (HSTS Strict-Transport-Security, Cross-Origin-Embedder-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy).
S2: Strengthen JWT validation in `isValidJWT` by requiring a non-empty signature component (`parts[2].length > 0`) and rejecting unsigned tokens.
S3: Unify API service transport layer by replacing raw `fetch` calls with `fetchWithAuthRetry` and `fetchWithCsrf` across work orders, maintenance requests, forms, manuals, tenants, profile, inventory, calendar, device forms, and budget documents, ensuring `credentials: 'include'` and CSRF token retry.
S4: Prevent client-proclaimed privilege escalation in WebSockets (`socketService.ts`) by removing client-side `role` and arbitrary auth attributes from `identify` payloads, and using `fetchWithAuthRetry` for polling.
S5: Clean up sensitive comments and remove orphaned/dead files (`workOrders.services.js`, `uploadService.ts`, `fetchWithLogs.ts`, `src/features/installations/hooks/assetServices.ts`).
S6: Ensure all test suites, linting, type-checking, and CI pipeline checks pass cleanly before committing and pushing.

## Tasks
- [x] T1 (linked S1): Update `vercel.json` with HSTS and Cross-Origin isolation headers.
- [x] T2 (linked S2): Update `isValidJWT` in `src/utils/sanitizer.ts` and add unit test for unsigned tokens.
- [x] T3 (linked S3): Migrate raw `fetch` calls in services to `fetchWithAuthRetry` / `fetchWithCsrf` with `credentials: 'include'`.
- [x] T4 (linked S4): Harden `socketService.ts` identify logic and polling fetch.
- [x] T5 (linked S5): Remove sensitive test credentials comment in `clientServices.ts` and delete dead/orphaned files.
- [x] T6 (linked S6): Verify unit tests, security tests, lint, type-check, build, and run CI checks.
- [x] T7 (linked S6): Commit work units and push to remote repository.

## Log
L1: "Podrias analizar todo el codigo y detectar vulnerabilidades"
L2: "Dale, ponete a resolver todo."
L3: "Cuando termines, commitea y pushea las modificaciones. Revisa que pasen CI CDS"
L4: All security remediation implemented, headers aligned, JWT validation hardened, services migrated to fetchWithAuthRetry/fetchWithCsrf, dead files removed, all tests and CI builds verified.

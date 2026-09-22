# SDD Init — super-admin-dashboard-redesign
**Artifact store:** engram · **Topic:** `sdd-init/super-admin-dashboard-redesign` · **Fallback:** local `openspec/changes/super-admin-dashboard-redesign/sdd-init.md`
**Date:** 2026-09-02 · **Mode:** auto · **Delivery:** ask-on-risk · **Review budget:** 800 lines
**Primary root:** frontGMAO (/home/jleone/work/frontGMAO) · **Secondary root:** backPanel (/home/jleone/work/backPanel)

## 1. Stack Inspection Summary

### frontGMAO
- **Runtime:** node >=24 <25, bun 1.3.5, `bun.lock` frozen, `packageManager: bun@1.3.5`
- **Framework:** react 19.2.8 + vite 8.1.5 + react-router 8.3.0 + zustand 5.0.14 (persist: localStorage `auth-storage`, sessionStorage `csrf-storage`)
- **UI today:** no Tailwind, no shadcn/ui, no Radix. CSS Modules + global tokens in `src/index.css` (`--color-bg #D1D1D1 / #121212 dark`, `--color-card #fff / #23272b`, `--color-secondary #057E74`, `--color-nav #ffffff / #0B1C1A`). Recharts 3.10.1, lucide-react 1.27.0, sonner, driver.js, react-icons. Alias `@` → `src`.
- **Build:** `vite build` → `dist/assets/{js,css,images}`, `asset-manifest.json`, CSP in `vite.config.ts`, proxy `/api` → `VITE_API_PROXY_TARGET` (default `https://api.leonix.net.ar`)
- **Testing:** vitest 4.1.10, `vitest.config.ts` (jsdom, `tests/setup.ts`), `bun run test` / `test:unit` / `test:integration` / `test:security` / `test:e2e` (playwright 1.62.0). Coverage v8, thresholds 80% lines/fn/branches/stmts. Type-check `tsc --noEmit`, lint `eslint 9.39.4` (max-warnings 999).
- **Auth:** httpOnly cookies `gmao_auth` / `gmao_refresh`, CSRF hash-bound, refresh rotation via `/api/refresh`.

### backPanel
- **Runtime:** node 24, express 5.2.1, mongoose 9.9.1, mongodb 7.5.0, bun 1.3.5, `driver.js` front-adjacent kept server-side for SSR PDFs.
- **Auth/RBAC:** `super_admin | admin | técnico | cliente`, middleware order `csrfProtection → validateToken → isSuperAdmin/isAdmin → identifyTenantByHeader`, JWT cookie, tenant isolation. **Note:** `services/auth.services.js` was reformatted externally (50k lines) — **re-read before editing** (also `utils/auth-cookie.js`, `middleware/security.middleware.js`, `services/hetzner.services.js`).
- **Testing:** vitest 4.1.10, `vitest.config.js` + `vitest.replica.config.js` (forks, single worker, 120s), coverage v8, layers `unit (~46) / integration (~13) / e2e / security (52) / replica / load (k6)`. Lint: `node --check **/*.js`; no eslint/prettier pinned. Security: `bun audit`, `secret-scan.js`, `verify-supply-chain.js`, Trivy SARIF.

## 2. Existing Dashboard Audit (Consistency Gap)

### super_admin — PanelAdmin.tsx (current)
- Path: `src/pages/PanelAdmin.tsx` + `src/features/tenants/components/*` + `src/features/tenants/styles/panelAdmin.module.css` (18k, heaviest CSS).
- **Header:** `h1` with `linear-gradient(135deg, var(--color-text) → var(--color-primary))` + `background-clip:text` + audit link pill — **AI-generated look** (gradient text, 56px icon containers with `bg 15 + border 30` alpha). Home uses flat `panelKicker` + `headerMetadata` + `rangeField`.
- **KPI cards:** `statsCardsRow` 4-col grid, `statsCard` 160px min-height, rounded 16px, `0 4px 20px rgba(0,0,0,.08)`, hover `translateY(-4px)` + gradient bg overlay. Home uses **`kpiBand`** (8-col band, 1px borders, `tabular-nums`, `720` weight, no shadows, flat band). Tokens diverge: PanelAdmin uses `box-shadow` + `cursor:pointer` on cards; Home uses band with `border-right/bottom`.
- **Charts row:** `chartsRow` with `TenantBarChart` + `TenantPieChart` (both Recharts, minimal wrappers). No `analysisGrid` semantics, no `chartDataTable` fallback, no `distributionList` parity with `WorkOrderStatusDistribution`.
- **Line chart:** solo `TenantLineChart` with 6-month synthetic evolution (computed client-side from `.getTenants()`). No reuse of `LineChart` pattern (Home’s `LineChart` handles `byPriority/byStatus` modes and empty states).
- **Recent tenants:** `RecentTenants` custom list card — vs Home’s `RecentWorkOrders` + `InventorySummary`/`contextCopy` split. Missing `resourceBand` concept, `dataNotices`, `offline/stale` handling, `TourButton`, `RangeFilter`.
- **Loading:** inline `Skeleton` ad-hoc vs Home `DashboardSkeleton` (skeletonTrend/distribution/work/attention) with `aria-busy` and `data-refreshing`.
- **A11y/i18n:** `t('panelAdmin.*')` present but section titles hard-coded Spanish (`Métricas Principales`, `Análisis de Datos`, `Evolución de Tenants`) vs Home `sectionHeading` using translation keys.

### admin/tecnico — HomeDashboard.tsx (reference)
- Path: `src/features/home/components/HomeDashboard.tsx` + `src/features/home/styles/home.module.css` (canonical).
- **Container:** `width min(100%,1320px)`, `padding 104px 28px 48px`, sections `margin-top 28px`, `border-bottom` in header, flat grids (`attentionGrid/workGrid/analysisGrid` 12-col, gap 18px).
- **Header:** `DashboardHeader` with `eyebrow/panelKicker` (0.72rem, 750 weight, 0.09em tracking, uppercase, secondary color), `headerMetadata` dl/dt/dd, `RangeFilter` 4-col pill with `rangeButtonActive` = `var(--color-text)` on `var(--color-card)` — restrained, not gradient.
- **KPIs:** `OperationalKPIs` → `kpiBand` band (no shadows), exception coloring via `warning/critical` classes on `dd`. Metrics via `DashboardMetric` with `hours/percent` formatting.
- **Analysis:** `LineChart` + `WorkOrderStatusDistribution` in `analysisGrid` — consistent `panel` chrome (1px border, 8px radius, `padding 20px`, flat bg).
- **Recent:** `workGrid` with `RecentWorkOrders` + conditional `InventorySummary` (admin) or `contextCopy` (technician) — contextual, not one-size list.
- **States:** `isOffline/isStale/fallbackApplied` → `dataNotices`; `DashboardSkeleton` matches grid exactly.

### Gap Summary
| Axis | PanelAdmin today | Home canonical | Action |
|---|---|---|---|
| Design system | gradient clip, shadow cards, alpha icon containers | flat band/panel, 1px borders, 8px radius, tabular-nums | align to Home tokens; remove gradient/shadow AI tells |
| Info architecture | KPI → chartsRow (2) → line → recent list | header→attention (KPI+Attention)→resourceBand→analysis→recent workGrid | adopt section order, keep tenant domain KPIs but render via `kpiBand`-like band |
| Responsiveness | auto-fit grids, mixed gaps | 12-col grids, consistent 18–24px | migrate to 12-col, reuse `home.module.css` primitives |
| Charts | bespoke Bar/Pie/Line wrappers, client synth evolution | reused `LineChart` + `Distribution` | unify recharts wrappers, move evolution calc to hook or keep but style-parity |
| Skeletons/Errors | ad-hoc divs, emoji ⚠️ | `DashboardSkeleton` + `fullError` | reuse shared skeleton pattern |

## 3. Tenants Page (Secondary super_admin Surface)
- Path: `src/pages/Tenants.tsx` + `src/features/tenants/styles/tenants.module.css` (5.3k) — table/cards toggle via `ViewToggle` + `DataTable` + `useResponsiveView`, 4-per-page, search, `AdministrativeTrialModal`. Already closer to Home flat language — **keep** table/card toggle, only harmonize header, search, and pagination to `home` density (consider reusing `SearchInput` + `Button` primitives).

## 4. shadcn/ui Feasibility
- **No Tailwind today.** Adding Tailwind + shadcn (Radix + `class-variance-authority`) is ~300–500 lines of config + tokens + primitives before any dashboard code. Within 800 budget but risks consuming >50% without slicing.
- **Preferred approach:** **shadcn-inspired, not shadcn-installed** for v1: replicate primitives (`Card`, `Badge`, `Skeleton`, `DataTable` header) with existing CSS Modules + tokens, inspired by shadcn density/spacing (h-9, gap-2, radius 8) but without introducing Tailwind build. Gate Tailwind adoption to **proposal question 2**; if accepted, slice as separate PR (PR-1 tokens/Tailwind, PR-2 PanelAdmin parity, PR-3 Tenants polish) to stay under 400 canonical per PR.

## 5. Backend Impact (backPanel)
- No schema change needed. `tenantServices.getTenants()` already supplies `stats.totalUsers/totalAssets/totalWorkOrders`, `plan`, `status`, `createdAt`. Evolution derived client-side; acceptable to keep client calc or add optional `/api/tenants/stats` aggregation later (out of scope for init). Verify `services/tenants.services.js` aggregation if Home parity needs server trend.

## 6. Configuration & Registry
- `frontGMAO/openspec/config.yaml` updated: `change: super-admin-dashboard-redesign`, context rewritten to redesign goal, `ui_target` added, notes updated with `auth.services.js` re-read and review_budget note.
- `backPanel/openspec/config.yaml` updated: same change name, dependency-only context, `review_budget_note: 800 shared, backend ≤200 lines`.
- `.atl/skill-registry.md` verified: 13 skills indexed, last 2026-09-02, no regeneration needed.
- `openspec/changes/super-admin-dashboard-redesign/` bootstrapped in both repos.

## 7. Proposal Question Round (ask-before-spec)
> Auto mode: questions posed here, answers deferred to proposal approval. Do NOT block init.

1. **Scope boundary:** Redesign *only* PanelAdmin (rute `panelAdmin`) or include Tenants + AuditLogs surfaces? Tenants already decent — should it be “parity polish” vs full redesign? Any super_admin-exclusive widgets (billing overview, system health) desired?
2. **Design system strategy:** Adopt Tailwind + shadcn/ui formally (requires `tailwind.config`, `components.json`, token mapping `--color-*` → shadcn CSS vars) or stay CSS Modules with shadcn-inspired primitives to minimize churn? Former gives long-term consistency; latter fits 800-line budget safer.
3. **AI-look guardrails:** Confirm “avoid AI look” = no gradients, no glassmorphism, no oversized rounded-3xl cards, prefer flat typography + tabular-nums. Should we lint for these (e.g., forbid `background-clip:text` in dashboard CSS)?
4. **KPI set:** Current 4 KPIs (totalTenants, activeTenants, totalUsers, totalAssets) vs extended set (suspended/cancelled, totalWorkOrders, plan conversion). Should KPIs be selectable/filtered by `RangeFilter` like Home (week/month/6m) or static?
5. **i18n & RBAC:** PanelAdmin titles currently hard-coded ES — enforce `t()` for all. Should `super_admin` see an embedded Tenants table + audit shortcut, or keep navigation separate via `MainLayout`? Confirm audit link stays?

**Assumptions interim:** (a) No new backend endpoint; (b) CSS Modules without Tailwind for v1; (c) KPIs remain 4 but styled as `kpiBand`; (d) Charts reuse existing Recharts data shapes; (e) Dark/light parity required.

## 8. Next Phases & Gates
- **Proposal:** capture question answers + assumptions, scope Tenants vs PanelAdmin, shadcn decision, KPI definition.
- **Spec:** `openspec/changes/super-admin-dashboard-redesign/specs/dashboard/spec.md` (delta spec, scenario Given/When/Then, visual parity criteria + a11y).
- **Design:** affected areas `PanelAdmin.tsx`, `Tenant*Chart.tsx`, `panelAdmin.module.css` → `home.module.css` alignment, `usePanelAdminDashboard` reuse; risks: token drift, recharts contrast in dark mode.
- **Tasks:** sliced ≤400 per PR: 1) header/kpiBand parity 2) analysisGrid/charts unification 3) recent tenants + skeletons + i18n. Ask-on-risk at 800 if Tailwind/shadcn approved.
- **Verify:** `bun run lint && bun run type-check && bun run test` + visual regression (Playwright screenshot) for both themes.

## 9. Delivery & Risks
- **Strategy:** ask-on-risk, auto-chain deferred. If shadcn/Tailwind pushes any PR >400, split into `super-admin-dashboard-redesign-tokens` + `panel-parity` + `tenants-polish`.
- **Risks:** (1) Tailwind injection conflicts with global `index.css` tokens — mitigate by mapping tokens, not replacing; (2) Gradient removal may be perceived as regression — mitigate with before/after screenshots; (3) Client-side evolution calc may mismatch server truth for large tenant counts — flag if `tenants.length` > 500.

---
*Generated by sdd-init executor (gentle-ai). Engram topic `sdd-init/super-admin-dashboard-redesign`; local fallback written. Skill resolution: paths-injected (registry present).*

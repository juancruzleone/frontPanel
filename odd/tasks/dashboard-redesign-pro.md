# Dashboard redesign pro (CMMS-GMAO)

## Feature
dashboard-redesign-pro (branch `feature/dashboard-redesign-pro`)

## Tasks
- [x] 1. Extend design tokens: elevation, radius hierarchy, spacing scale, type hierarchy in dashboard-tokens.css — done, +157/-5 en dashboard-tokens.css; type-check OK, lint 0 errores (839 warnings preexistentes)
- [x] 2. Rediseñar header + banda KPI — done: header con kicker pill + underline de marca, banda KPI con elevación/radius/spacing tokens y celdas con estados semánticos, attention panel priority-1 con elevación raised; type-check OK, lint 0 errores, Home suite 32/32. Nota: 8 fallos preexistentes en Nav/Inventory (ajenos a home) en el worktree
- [x] 3. Redesign analysis/work grids and panels — done: sistema único de cards (anatomía consistente), trend/distribution/lists/inventory tokenizados, type-check OK, lint 0 errores, Home 32/32
- [x] 4. Semantic state tokens — done de forma cubierta por tasks 2-3: grep en src/features/home/ da 0 hex/rgb, 0 inline styles, 0 !important, 0 .dark locales; 51 var(--state-*), 52 var(--type-*), 4 var(--elevation-*)
- [x] 5. Responsive + reduced-motion + a11y — done: fix contraste warning (4.38→6.18:1), pills a ancho completo en 640px, alturas de skeleton; reduced-motion OK sin cambios nuevos; Home 32/32, git diff --check limpio
- [x] 6. Verificar — done (inline, tras 3 fallos de gentle-ai-verify): type-check OK, lint 0 errores/839 warnings, Home 32/32, full suite 1119 pass / 8 fail (exactamente los 8 preexistentes Nav+Inventory), git diff --check limpio, 0 hex/0 inline styles/0 !important, i18n keys es+en OK
- [x] 7. Enterprise visual pass revision — done: radíos bajados (panel 8 / card 6 / control-badge 4px, sin pills 999px salvo dots circulares), ritmo 4/8px en toda la escala de spacing, sombras de una sola capa y eliminación de --hairline-highlight, removal de barras decorativas (header underline, sectionHeading bar, attentionPanel gradient 3px, kpiCell warning/critical edge 3px, alertList/inventoryItemLow/panelAdmin.attentionRow border-left 3px), toasts/driverjs con radios bajados, kickers y eyebrows en color neutro (accent reserved for acciones). Evidencia: vitest home+tenants 53/53, type-check OK, lint 0 errores/839 warnings, full suite 1119 pass / 8 fail (preexistentes Nav+Inventory), git diff --check limpio, sin gradient/border-left 2-9px en superficies de dashboard (solo shimmer de skeleton y dots semánticos)
- [x] 8. Work-unit commit 1 — done: `c60e44b` (813 líneas). Spot-check del parent antes del commit: type-check OK, lint 0 errores / 839 warnings, tests/unit/features/home 32/32.
- [x] 9. P0 UX: refresco no destructivo + filas accionables + error de inventario visible + barra de distribución honesta — done por gentle-ai-worker. Verificado en navegador: el rango conserva panel y foco, filas navegan vía getRoute, error de inventario distinguible de vacío, segmentos con proporción real.
- [x] 10. P0 chrome: botón de ayuda abajo a la derecha + tarjeta de usuario sin truncado — done. Verificado en navegador a 1440 y 390: Home e Instalaciones comparten clase, position fixed, bottom/right 16px, 56x56, z-index 10; al final del scroll móvil la última fila es alcanzable y hay 0 elementos tapados; la tarjeta muestra "María / Administrador" completo.
- [x] 11. P1 visual: fondo claro, proporción de KPIs, alturas de panel, banda de cobertura, chips de leyenda — done. Verificado: canvas #F6F7F8 en claro y #121212 en oscuro; legend chips sin affordance falsa.
- [x] 12. Verificación + work-unit commit 2 — done: `15e1f8e`. Verificación independiente (gentle-ai-verify) + verificación de navegador del parent.
- [ ] 13. Cobertura: agregar métrica Clientes, hacer clickeables Instalaciones/Activos/Técnicos/Clientes, y que la banda ocupe todo el ancho

## Revision 2026-09-24 23:50: post-implement corrections
- User reported two defects after the first P0/P1 pass: (a) blank canvas inside the attention row, (b) skeleton not matching loaded content. Measured root cause for (a): `align-self: start` + `align-content: start` left the KPI card at 239px inside a 659px row (~420px of bare canvas). After the fix the row measures 659/659. For (b) the skeleton now renders the real section structure; measured loading heights 659/448/525 match loaded 659/448/525, with `aria-busy="true" aria-label="Cargando panel"` and no layout shift.
- User then requested the help button be bottom-right in every section with Home matching the rest. A previous pass had made `.tourButton` `position: static` globally and rendered Home through `TourButton inline` inside `DashboardHeader`. Both were reverted: shared floating class restored (token-based, safe-area aware), Home renders the plain variant.
- Three unit tests regressed and were fixed; proven not pre-existing by running both files in a clean detached worktree at `c60e44b` (10/10 passed there).
  1-2. `tests/unit/pages/Installations.test.tsx`: jsdom crashed in `font-sizes.js:116` because `env()` nested inside `calc()` could not be resolved during accessible-name computation. Fixed by separating safe-area `env()` from `calc()`.
  3. `tests/unit/features/workOrders/workOrdersUiContracts.test.ts:201`: the `[\s\S]*?` regex crossed rule boundaries and had been passing only because it matched the now-removed `.tourButtonInline:hover`. Human explicitly authorized correcting the assertion (option A); it is now block-bounded and stricter. The removed dead CSS was not restored.
- Note: `gentle_review assess` returned `unassessable` twice (untracked-file declaration, then `schema-incompatible`), so per contract the candidate is treated as high risk and required an independent verifier.

## Context
Recovered from crashed session 2026-09-24T16-38-29. User request: "modifiqué el diseño del dashboard; no quiero que se vea generado por IA; panel lindo, moderno, profesional, buen UX/UI; CMMS-GMAO; ajustar todos los contenedores."

Explore findings (recovered): CSS Modules + tokens propios (sin Tailwind/MUI); grid 12 col sólido; copy i18n CMMS correcto. Problemas: `--elevation-card: none` (aspecto hoja de cálculo), radios uniformes 4/6/8px sin jerarquía, spacing apretado (18px grid, fuentes 0.72rem), colores de estado hardcodeados fuera de tokens, doble sistema de tema con !important, sin primitivas reutilizables, sidebar/TopBar no tokenizados (fuera de alcance aquí).

Key files: src/shared/styles/dashboard-tokens.css, src/features/home/styles/home.module.css, src/features/home/components/{HomeDashboard,DashboardHeader,OperationalKPIs,AttentionRequired,LineChart,InventorySummary,RecentWorkOrders}.tsx, src/i18n/locales/*.json, tests/unit/features/home/**.

## Revision 2026-09-24: enterprise visual pass
- User requested a full visual pass across dashboard sections: lower border radii, remove decorative colored borders/gradients that read as AI-generated, improve spacing and UX hierarchy, and align with restrained enterprise admin references.
- Research direction: 4px default radii, 8px spacing rhythm, 24px section gaps, neutral 1px dividers, restrained single accent, cards for summaries and data-first work surfaces.
- Scoped surfaces: `src/shared/styles/dashboard-tokens.css`, `src/features/home/styles/home.module.css`, `src/features/tenants/styles/panelAdmin.module.css`, `src/index.css`; preserve existing class names, i18n, and responsive contracts.
- Outcome: referencia `EJEMPLO.png` (admin oscuro, canvas neutro, cards ~8px, borde 1px neutro, acento teal restringido a activo/primario) usada como norte visual. Se conservaron breakpoints 1050/640, `prefers-reduced-motion`, focus-visible, i18n y nombres de clase.

## Revision 2026-09-24 22:57: design review (read-only, rendered evidence)
User request: "Necesitaria que revises la seccion de inicio, y detectes mejoras de diseño. Quiero que sea un dashboard de un panel profesional, lindo, moderno con buen UX UI."

Method: rendered the panel against a mocked API with Playwright and captured desktop light/dark, tablet and mobile (`/tmp/shot/`, outside the repo). The captures already include tasks 1-7, so the findings below are open defects on top of the visual pass.

Scope decision (user): "Pulido P0 + P1". Commit decision (user): split — commit the existing visual pass first, then P0/P1.

P0 defects:
1. Range change replaces the whole dashboard (including the active control) with a skeleton — kills keyboard focus and visual continuity. `useHomeDashboard.ts:128,149-159`, `HomeDashboard.tsx:25`.
2. False affordance: recent orders, incident installations, preventive appointments and inventory rows have hover but are not clickable. `home.module.css:706,770,892`, `RecentWorkOrders.tsx:40`.
3. Inventory failure renders as "empty inventory": catches return empty arrays instead of surfacing the partial error. `useHomeDashboard.ts:40-60`, `InventoryAlerts.tsx:31-39`.
4. Distribution bar misrepresents data: a zero-count category still gets visible width (min-width 1). `WorkOrderStatusDistribution.tsx:40`, `home.module.css:677-686`.
5. Help FAB overlaps list content on mobile.
6. Sidebar user card truncates the name ("María …") and wraps the role ("Administra / dor").

P1 polish:
7. `--color-bg: #D1D1D1` reads as a heavy mid-grey canvas in light mode.
8. KPI cells are ~250px tall with little content and only two cells carry full background tint (reads like a layout bug).
9. Panel heights are uneven (distribution panel ends mid-card).
10. "Cobertura" band spreads three numbers across a full row.
11. Chart legend chips look like buttons but toggle nothing.
12. Sidebar/TopBar use a neon-green accent on near-black while the dashboard uses semantic teal — two visual systems.

Out of scope (needs backend or shell-wide blast radius): KPI delta vs previous period (no API field), full sidebar/TopBar re-tokenization.

## Acceptance
- Lower, intentional radius hierarchy with no pill-like decorative treatment except truly semantic status controls.
- No decorative colored bars, gradient underlines, or colored card edges across dashboard surfaces.
- More breathing room between sections while preserving operational density and responsive behavior.
- Neutral enterprise canvas, 1px dividers, restrained accent, and clear data/action hierarchy.
- Elevación real y jerarquía visual clara (cards principales vs secundarias)
- Radios y spacing con jerarquía; tipografía con escala legible
- Cero look "genérico IA": layout orientado a excepciones para CMMS
- Estados semánticos via tokens, sin hex hardcodeados en clases nuevas
- Responsive 1050/640 intacto, prefers-reduced-motion respetado, i18n sin keys rotas
- Cambiar el rango conserva el panel y el foco del control activo
- Filas de órdenes/incidentes/preventivos/inventario navegan a su registro
- Error de inventario se distingue de inventario vacío
- Barra de distribución refleja valores reales (0 = 0 ancho)
- FAB de ayuda no tapa contenido en móvil; tarjeta de usuario sin truncado
- lint 0 errores, type-check OK, test:unit PASSED

## Verification
- TDD mode: off (no explicit project/session TDD configuration found; resolved from absence of `.pi` TDD config and no user choice). Source: parent session. Runner: `bun run test:unit` (vitest).
- Known pre-existing failures: 8 (Nav + Inventory), unrelated to home.

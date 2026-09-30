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
- [x] F14. Transporte, contrato y validación del comparativo KPI.
  - Objetivo: solicitar `range=<rango efectivo>&compare=true` mediante `fetchWithAuthRetry`, tipar `kpisPrevious`/`previousWindow` y validar el payload antes de mapearlo.
  - Problema y por qué: el frontend usa `fetch` directo y confía en un cast; una sesión expirada pierde el retry compartido y un payload parcial puede fallar tarde en `reduce`/`map`.
  - Scope autorizado: hook/servicio de Home, DTOs, validador mantenible sin dependencia nueva, fixtures y tests de request, auth retry y payload malformado.
  - Constraints: conservar aislamiento por rol/rango, cache y enriquecimientos; fallar de forma controlada; no build; no cambios backend.
  - Acceptance: request con rango efectivo y `compare=true`; wrapper compartido probado; `null`/unavailable representados con honestidad; payload parcial/malformado produce `home.dashboard.errors.loadFailed` sin excepción de render.
  - Checks: Vitest enfocado de hook/contrato + `bun run type-check` + `git diff --check`.
  - TDD: OFF. Source: documento ODD actual, sin configuración explícita de proyecto/sesión. Runner: `bun run test:unit` (Vitest); se añadirán tests conductuales junto al código.
  - Forecast: ~220 líneas authored. Delivery: `ask-on-risk` resuelto por autorización a `feature-branch-chain`.
  - Branch/slice: `feature/dashboard-kpi-comparison`, slice 1, commit de transporte/contrato/validación.
  - Progreso: implementado. Evidencia enfocada: `bunx vitest run tests/unit/features/home/dashboardStatsService.test.ts tests/unit/features/home/useHomeDashboard.test.tsx` → 20/20; `bun run type-check` → exit 0; `git diff --check` → exit 0. Runtime harness: N/A, la frontera HTTP está cubierta con `Response` real y wrapper mockeado sin servidor frontend autorizado.
  - Rollback: revertir únicamente `dashboardStatsService.ts`, cambios de contrato en `homeTypes.ts`, import del hook, fixture y tests de esta unidad; no afecta mapper/UI.
  - Next step: registrar SHA real y comenzar F15 sobre el contrato validado.
- [ ] F15. Mapper, tendencias accesibles y coherencia temporal durante refresh.
  - Objetivo: derivar comparaciones solo con valores medibles y mostrar la dirección de negocio correcta sin etiquetar datos viejos con el rango solicitado.
  - Problema y por qué: el rango seleccionado cambia antes de que cambien los datos aplicados; además no existe semántica frontend para cero→positivo, positivo→cero, N/A ni para métricas donde bajar es mejorar.
  - Scope autorizado: mapper, modelo de vista, `OperationalKPIs`, `HomeDashboard`, estilos/i18n existentes y tests de mapper/render/refresh.
  - Constraints: una sola fuente de verdad para el rango aplicado; refresco no destructivo y foco intactos; no usar color como única señal; menor es mejor para vencidas/críticas, MTTR y primera respuesta, mayor es mejor para MTBF, cumplimiento preventivo y SLA.
  - Acceptance: N/A si actual o anterior no es medible; cero→positivo y positivo→cero no dividen por cero ni inventan porcentaje; tendencia incluye texto/símbolo accesible; cumplimiento preventivo `null` se muestra N/A; durante refresh el control solicitado y el estado indican explícitamente qué rango sigue aplicado.
  - Checks: Vitest enfocado mapper/OperationalKPIs/HomeDashboard + parity de i18n + `bun run type-check` + `git diff --check`.
  - TDD: OFF. Source: documento ODD actual. Runner: `bun run test:unit` (Vitest), con cobertura conductual añadida.
  - Forecast: ~320 líneas authored. Delivery: `feature-branch-chain` por superar el presupuesto acumulado de ~400 líneas.
  - Branch/slice: `feature/dashboard-kpi-comparison`, slice 2 encadenado sobre F14.
  - Progreso: pendiente.
  - Rollback: revertir modelo de tendencia, mapper, render/CSS/i18n y sus tests sin retirar el contrato HTTP de F14.
  - Next step: cerrar F14 y usar sus tipos validados como única entrada.
- [ ] F16. Limpieza de logging de plantillas.
  - Objetivo: retirar `console.log('Templates recibidos:', data)` de producción.
  - Problema y por qué: expone ruido/datos en consola sin aportar manejo de errores.
  - Scope autorizado: `src/features/assets/components/ModalAssignTemplate.tsx`; test solo si demuestra comportamiento útil.
  - Constraints: no alterar carga, selección ni error de plantillas.
  - Acceptance: log eliminado y comportamiento existente intacto.
  - Checks: lint enfocado/global disponible + `git diff --check`; test del componente solo si ya existe una frontera útil.
  - TDD: OFF. Source: documento ODD actual. Runner: `bun run test:unit` (Vitest).
  - Forecast: 1 línea authored. Delivery: integrar en una unidad solo si encaja limpiamente; en caso contrario commit `Fix:` acotado.
  - Branch/slice: `feature/dashboard-kpi-comparison`, slice 3 opcional.
  - Progreso: pendiente.
  - Rollback: restaurar una única línea, sin dependencia con F14/F15.
  - Next step: ejecutar después de cerrar las unidades funcionales.
- [ ] F17. Verificación final y cierre documental.
  - Objetivo: ejecutar todos los checks disponibles sin build/Playwright persistente, registrar evidencia real, SHAs y límites de rollback.
  - Scope autorizado: lint, type-check, unit/integration/security, `git diff --check`, status/diffs/log y este documento.
  - Constraints: no build, push, PR, merge, review nativa ni limpieza de evidencia ajena.
  - Acceptance: resultados exactos distinguen éxito, warning, fallo preexistente y pending; cada unidad queda en commit convencional con paths explícitos.
  - Forecast: ~40 líneas documentales. Delivery: Docs commit final acotado solo si registrar SHAs deja cambios pendientes.
  - Branch/slice: `feature/dashboard-kpi-comparison`, cierre de cadena local.
  - Progreso: pendiente.
  - Rollback: revertir solo el commit documental; no modifica comportamiento.
  - Next step: comenzar F14.
- [ ] F18. Estabilizar dependencias vulnerables en la rama tracker.
  - Objetivo: actualizar las resoluciones de `brace-expansion` y `undici` a versiones sin advisories, conservando un lockfile reproducible.
  - Acceptance: `bun audit` y el security audit remoto no reportan esos advisories; regresión existente verde.
  - Checks: instalación congelada, audit, security/unit/integration, lint y type-check. Build local prohibido.
  - TDD: OFF; remediación validada por audit y regresión.
- [ ] F19. Corregir el contrato real de borrado offline `DELETE_WORK_ORDER`.
  - Objetivo: confirmar que la mutación se encoló antes de informar éxito local; si no existe identidad autenticada, fallar explícitamente en vez de descartar la operación.
  - Acceptance: prueba conductual reproduce identidad ausente y demuestra que nunca se elimina solo de la UI; E2E remoto confirma cola y sincronización.
  - Checks: Vitest enfocado, suite unitaria/integración y E2E remoto. Build local prohibido.
  - TDD: OFF; cobertura conductual añadida junto al fix, sin adaptar producción a selectores del E2E.
- [ ] F20. Aplicar code splitting real al bundle.
  - Objetivo: introducir fronteras lazy por rutas, sin elevar límites ni ocultar reportes.
  - Acceptance: navegación/type-check/tests verdes y `Bundle Size Analysis` remoto dentro del umbral vigente.
  - Checks: lint, type-check, tests y medición exclusiva en CI remoto; no build local.
  - TDD: OFF; cambio estructural cubierto por contratos de rutas y CI.
- [ ] F21. Publicar evidencia Lighthouse honesta.
  - Objetivo: separar recolección y subida con acciones soportadas y rutas reales, manteniendo fallos de auditoría visibles.
  - Acceptance: auditoría y upload verdes, artefacto descargable; sin `continue-on-error` ciego.
  - Checks: validación estática disponible y workflow remoto.
  - TDD: OFF; frontera de CI verificada remotamente.
- [ ] F22. Verificar y propagar la cadena.
  - Checks locales: lint, type-check, unit/integration/security/audit y `git diff --check`; build local prohibido.
  - Chain: corregir primero `feat/dashboard-redesign-pro` y propagar con merges normales a #10 → #11 → #12; nunca rebase/force.
  - Acceptance: fusionar hijos y tracker solo verdes; `origin/main` contiene `06ce2a3`; RDD clone-local `disabled/unmanaged`.
- [ ] F23. Auditar e integrar/limpiar ramas offline.
  - Evidencia: ancestry, commits únicos, docs/tasks, PR/issues, worktrees y checks.
  - Disposición: `merged`, `superseded`, `incomplete/unsafe` o `deliverable`.
  - Acceptance: deliverables solo por issue aprobado + PR/cadena + pruebas; conservar incomplete; borrar únicamente ramas fusionadas/supersedidas demostrables libres de worktree; preservar main y worktrees ajenos.

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

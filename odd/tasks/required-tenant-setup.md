# Required tenant setup
Objective: replace tours with ordered, mandatory, server-validated tenant configuration. Branch: `feature/configuracion-inicial-obligatoria` in frontGMAO and backPanel.
Delivery: feature-branch-chain (local commits only; no push/PR/merge). Forecast: ~1800–2600 authored lines across behavior slices. Runners: Bun/Vitest, TypeScript/ESLint, Playwright; no backend build.

## Specs
S1. "Lo que encontré que corregiría antes de implementar el bloqueo"; "En ModalManageAssetCategories.tsx, la función handleAdd contiene un comentario que indica que todavía falta implementar la creación de categorías. Después limpia el formulario, recarga activos y muestra un mensaje de éxito."; "Además, useAssets.ts obtiene sus categorías desde las categorías de formularios. Esto confirma que hay una confusión entre «categorías de activos», «categorías de dispositivos» y «categorías de formularios» que conviene resolver antes de hacer obligatoria esa configuración."
S2. "Empresa identificada    Sí, verificar    Es la base del tenant"; "Tipo de instalación    Sí, al menos uno    Se requiere al crear instalaciones"; "Categoría de dispositivo    Sí, al menos una    Se requiere al asignar equipos"; "Categoría de formulario    Sí    Se necesita para crear plantillas"; "Plantilla de mantenimiento    Sí, al menos una válida    Los activos requieren templateId".
S3. "Activo de catálogo    No    Es información operativa"; "Primera instalación    No    Puede cargarse posteriormente"; "Stock inicial    No    No debería ser un requisito de configuración"; "Técnicos    No    Pueden incorporarse después"; "Clientes    No    No todos los clientes necesitan este módulo inmediatamente"; "Órdenes de trabajo    No    Requieren una operación ya definida"; "Preventivo y frecuencias    No    Se configuran cuando existen instalaciones"; "Inventario y proveedores    No    Son módulos complementarios"; "Manuales    No    Documentación opcional"; "Normas y cumplimiento    No    Configuración especializada".
S4. "Registro / inicio de sesión"; "Verificación de la configuración del tenant"; "Incompleta"; "Asistente obligatorio"; "Completa"; "Acceso al panel"; "En el backend agregaría un estado persistente, por ejemplo onboarding.status, junto con la versión del proceso y la fecha de finalización. Antes de marcarlo como completo, el servidor debería comprobar los requisitos reales del tenant."
S5. "No utilizaría el localStorage de los tours actuales para determinar el acceso. Paso a paso en ORDEN. Y eliminas las guias turisticas de todas las secciones."
S6. "Que funcione integrado con backPanel."; "Si, te autorizo. Mandale hasta terminar."

## Tasks
- T1 | S1 | delegated (context backstop) | done | Correct category persistence and terminology without inventing a new asset category resource. RED 8failed/1passed, GREEN 11passed categoryPersistence; parent spot check 11passed. Unrelated globals fail (i18n workOrders keys, WorkOrders.tsx types). Commit: c36c75f (slice 1; 558 authored lines, honest overage from dead-code deletion plus regression test; chain continues).
- T2 | S2-S4,S6 | inline (writer gate refused: ODD doc lives in sibling repo) | done | Tenant-scoped persistent onboarding status/completion and server operational gate. Risk: item 2 (tenant access guard). RED structural (missing modules), GREEN 8passed tenantOnboarding; integration 439passed; security back to pre-existing baseline (7 unrelated failures in dirty billing/auth services). Commit: b70014c (slice 2; honest overage, chain continues).
- T3 | S2-S6 | delegated (context backstop) | done | Ordered setup UI and server-driven protected-route gate; explicit retry/failure and role-aware waiting. Reuse catalog/template creation behavior. Risk: item 2 (access guard). RED missing modules + selectors, GREEN 15passed focused, 1630passed unit, type-check clean, lint 0 errors; parent spot check 15passed. Accepted: per-navigation server fetch without TTL cache (no stale grants). Commit: 0fbb9d9 (slice 3; honest overage 1161 insertions, one coherent behavior, chain continues).
- T4 | S5 | delegated worker timed out, finished inline | done | Remove all tour hooks/buttons/auto-starts/styles and obsolete tour-only localStorage behavior; preserve unrelated layout/navigation. Structural verification: zero driver.js/useHomeTour/usePersonalTour refs, zero tour localStorage keys, zero onboardingService refs; i18n parity 6passed; unit 1622passed/1skipped (excl. hanging concurrent incidents dir), type-check clean, lint 0 errors. Known remainder: nav-work-orders* data-tour kept (used by offline-sync e2e selectors); driver.js dep left installed (no package.json/bun.lock churn). Risk: none (pure removal, no shared behavior changed). Commit: 3e98d08 (slice 4; honest overage 6934 deletions, one coherent removal, chain continues).
- T5 | S1-S6 | independent verify (item 2) plus parent seam checks | in_progress | Verify complete integration, regressions and browser flow; record missing/failed proof truthfully. Final docs/commits. Commit: pending.

## Log
L1. Original request (verbatim):
Podrias modificar las guias turistica del inicio, por un sistema de configuracion? Que funcione integrado con backPanel. Tipo un sistema de configuracion inicial, revisa todo lo que necesita para empezar a usar bien el sistema. Pero que sea obligatorio completarlo para poder acceder al sistema, que configure Tipos de instalacion, categorias de dispositivos, categorias de formularios. Lo que encontré que corregiría antes de implementar el bloqueo
Hay un hallazgo importante en frontPanel:

En ModalManageAssetCategories.tsx, la función handleAdd contiene un comentario que indica que todavía falta implementar la creación de categorías. Después limpia el formulario, recarga activos y muestra un mensaje de éxito.

Es decir, ese modal puede informar que creó una categoría sin haberla guardado realmente.

Además, useAssets.ts obtiene sus categorías desde las categorías de formularios. Esto confirma que hay una confusión entre «categorías de activos», «categorías de dispositivos» y «categorías de formularios» que conviene resolver antes de hacer obligatoria esa configuración.
Mi clasificación definitiva
Configuración    ¿Obligatoria antes de entrar?    Motivo
Empresa identificada    Sí, verificar    Es la base del tenant
Tipo de instalación    Sí, al menos uno    Se requiere al crear instalaciones
Categoría de dispositivo    Sí, al menos una    Se requiere al asignar equipos
Categoría de formulario    Sí    Se necesita para crear plantillas
Plantilla de mantenimiento    Sí, al menos una válida    Los activos requieren templateId
Activo de catálogo    No    Es información operativa
Primera instalación    No    Puede cargarse posteriormente
Stock inicial    No    No debería ser un requisito de configuración
Técnicos    No    Pueden incorporarse después
Clientes    No    No todos los clientes necesitan este módulo inmediatamente
Órdenes de trabajo    No    Requieren una operación ya definida
Preventivo y frecuencias    No    Se configuran cuando existen instalaciones
Inventario y proveedores    No    Son módulos complementarios
Manuales    No    Documentación opcional
Normas y cumplimiento    No    Configuración especializada

Cómo haría que funcione el bloqueo
La secuencia sería:
Registro / inicio de sesión


Verificación de la configuración del tenant


Incompleta

Asistente obligatorio


Completa

Acceso al panel En el backend agregaría un estado persistente, por ejemplo onboarding.status, junto con la versión del proceso y la fecha de finalización. Antes de marcarlo como completo, el servidor debería comprobar los requisitos reales del tenant.

No utilizaría el localStorage de los tours actuales para determinar el acceso. Paso a paso en ORDEN. Y eliminas las guias turisticas de todas las secciones.
L2. User authorization (verbatim): "Si, te autorizo. Mandale hasta terminar." Explicitly confirms /home/juan/work/backPanel read/write for this session.
L3. User delivery choice: `feature-branch-chain`; local feature branches created in both repositories. No publication authorization.
L4. Backend contains unrelated, actively changing uncommitted security/billing changes. Preserve them; never stage or commit them. Prefer additive onboarding files plus clean route mount integration. Frontend was clean.
L5. `gentle-ai review mode status` unavailable: shell command not found. Native review availability will be reported; no switch changes or workaround installation.
L6. Implementation interpretation: no distinct asset-category collection is evidenced. Assets inherit form categorization through templates; device categories remain the independent /categorias catalog. Valid template follows existing schema and references an active tenant form category; no invented maintenance flag.
L7. T1 done: legacy asset modal reuses form-category CRUD, exposes formCategories alias, focused 11passed; unrelated frontend concurrent changes preserved and excluded from T1 slice; global i18n/type failures remain outside T1.
L8. Slice boundary: T1 = commit c36c75f (285 insertions, 273 deletions across 7 files). Delivery chain_strategy=feature-branch-chain; next behavior commit starts slice 2 (backend).
L12. T5 backend verify (mvsfpbjh-6-zwfa): S2/S3/S4/S6 MET; probes tenantOnboarding 8passed, isolation 19passed, shutdown 3passed, all exit 0; no blockers; pre-existing token/security failures confirmed unrelated.
L15. Publicado y mergeado en orden: backPanel#41 merge af0aa50 (con justificación de CI rojo ambiental), frontPanel#30 merge 6801a8d (CI totalmente verde). Ramas de publicación eliminadas. El commit ajeno 9372b99 nunca viajó.
L14. E2E follow-up on publish branch: existing specs mocked API without the new endpoint, so the fail-closed gate redirected to setup (correct behavior, missing precondition). Added onboarding-complete mocks to 6 e2e specs (context-level route in offline-sync because SW re-emitted fetches bypass page.route and hit the dev proxy), removed 2 obsolete Suppliers clearance tests asserting 88px for the deleted floating button. Verified locally: affected specs green. Commit db0c80b on PR branch, cherry-picked to worktree as 13137a4. Deploy order note: merge backend PR first so the endpoint exists when frontend goes live; otherwise SW-controlled clients see the retry state (fail-closed, no access granted).
L13. T5 frontend verify (mvsfpe0p-7-yng4): S2/S3/S4/S5/S6 MET; probes focused 15passed, type-check clean, router 13passed; no blockers. Browser flow (throwaway Playwright spec, deleted after): incomplete tenant redirected to /configuracion-inicial with 5 steps in exact order; complete tenant reaches panel; 2passed.
L11. T4 worker timed out on a 30min bash (its vitest run hung on the concurrent incidents/ModalReportIncident test); finished inline. Orphaned 111min-CPU vitest processes killed. Peer session notified of their hanging test. Full unit suite green excluding that directory. Tour removal verified tour-pure per hunk; concurrent hunks (incidents UI, client requests, i18n additions, work-orders families) excluded via selective staging and preserved in worktree.
L10. T3 done (slice 3 = commit 0fbb9d9): SetupWizard in S2 order reusing existing catalog modals lazily, OnboardingGate after auth/billing/role checks with super_admin and self-path bypass, fixed SETUP_PATH outside translated loops, failure shows retry and never grants access, non-admin waiting state. No localStorage authority.
L9. T2 done inline in backPanel (slice 2 = commit b70014c, 657 insertions across 10 files): GET /api/tenant/onboarding, POST /api/tenant/onboarding/complete (409 + missing, no mutation), global known-path gate in server.js with exempt setup/auth/billing/health/public segments, mount tenant-onboarding. Existing suites updated with the new mandatory precondition (compliance helper seeds catalog + validated completion; reglas restores valid template after wipe; isolation seeds catalog + complete): integration 439passed, shutdown 3passed, isolation 19passed, new 8passed. Pre-existing failures preserved and untouched: unit token.service/token.tenant-binding (dirty billing/auth services), security tenantAwareLogin 6 + mercadoPagoLegacyOnly 1 (same dirty area). Unrelated concurrent edits in both repos preserved and excluded via selective staging (frontend es/en hunks; backend work-orders families hunk).

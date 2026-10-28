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
- T1 | S1 | delegated (context backstop) | done | Correct category persistence and terminology without inventing a new asset category resource. RED 8failed/1passed, GREEN 11passed categoryPersistence; parent spot check 11passed. Unrelated globals fail (i18n workOrders keys, WorkOrders.tsx types). Commit: pending.
- T2 | S2-S4,S6 | delegated (context backstop) | in_progress | Add tenant-scoped persistent onboarding status/completion and server operational gate, preserving auth/billing/setup access and existing permissions. Risk: item 2 (tenant access guard). HTTP tests including rejected/no-mutation and tenant isolation. Commit: pending.
- T3 | S2-S6 | delegated (context backstop) | pending | Ordered setup UI and server-driven protected-route gate; explicit retry/failure and role-aware waiting. Reuse catalog/template creation behavior. Risk: item 2 (access guard). Commit: pending.
- T4 | S5 | delegated (context backstop) | pending | Remove all tour hooks/buttons/auto-starts/styles and obsolete tour-only localStorage behavior; preserve unrelated layout/navigation. Commit: pending.
- T5 | S1-S6 | independent verify (item 2) plus parent seam checks | pending | Verify complete integration, regressions and browser flow; record missing/failed proof truthfully. Final docs/commits. Commit: pending.

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

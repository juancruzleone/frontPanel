# KPIs cliente + OT cliente + solicitudes — frontGMAO & backPanel

Header: El rol cliente ve sus propios KPIs de sus instalaciones, accede a Órdenes de trabajo filtradas a sus instalaciones, sin botón Registrar activos en dashboard, y las solicitudes de cliente se ven como estado/zona tanto en admin como en cliente.

## Specs

- S1 (verbatim usuario): "Necesitaria que los usuarios con rol de clientes, tengan sus propios KPIS, tipo de sus instalaciones, revisa tanto frontGMAO como backPanel."
- S2 (verbatim usuario): "Necesitaria que tambien tenga acceso a la seccion de ORDENES DE TRABAJOS, pero que solo vean las ordenes de trabajos asociadas a sus instalaciones."
- S3 (verbatim usuario): "Y tambien necesitaria que en el DASHBOARD le elimines el boton de Registrar activos."
- S4 (verbatim usuario): "Y que le agregues una zona o un estado para ver las solicitudes pedidas por el cliente tanto para el usuario ADMIN del tenant, como en la vista del CLIENTE. Tipo no se un estado mas para las ordenes de trabajo no se FIJATE."
- S5 (verbatim usuario): "y RESOLVE TODO ESTOOOO. Cuando termines, commitea y pushea las modificaciones, revisa que pase CI CD"
- S6 (decisión): nuevo estado `solicitada` como estado inicial de las solicitudes de cliente (`origen=solicitud_cliente`). Transiciones: solicitada→pendiente|asignada|cancelada. Cuenta como abierta en dashboard/KPIs. Visible en kanban/tabla/filtros con color propio y badge de origen.

## Tasks

- T1 (S1): back dashboard scope cliente ya existente — verificar + tests — route: inline (backPanel) — hecho
- T2 (S1,S3): front dashboard cliente: KPIs propios + ocultar Registrar activos (+ modales) — route: inline (frontGMAO) — hecho
- T3 (S2): front acceso cliente a OT: roleUtils + router + WorkOrders read-only con mis-ordenes-trabajo — route: inline (frontGMAO) — hecho
- T4 (S4,S6): back estado solicitada: lifecycle + schemas + clientViews + dashboard normalize — route: inline (backPanel) — hecho
- T5 (S4,S6): front estado solicitada: translations + kanban + tabla + filtros + origen badge (admin+cliente) — route: inline (frontGMAO) — hecho
- T6 (S5): checks + commits + push + CI/CD en ambos repos — route: inline — hecho

## Log

- L1 (verbatim request): "Necesitaria que los usuarios con rol de clientes, tengan sus propios KPIS, tipo de sus instalaciones, revisa tanto frontGMAO como backPanel. Necesitaria que tambien tenga acceso a la seccion de ORDENES DE TRABAJOS, pero que solo vean las ordenes de trabajos asociadas a sus instalaciones. Y tambien necesitaria que en el DASHBOARD le elimines el boton de Registrar activos. Y que le agregues una zona o un estado para ver las solicitudes pedidas por el cliente tanto para el usuario ADMIN del tenant, como en la vista del CLIENTE. Tipo no se un estado mas para las ordenes de trabajo no se FIJATE. y RESOLVE TODO ESTOOOO. Cuando termines, commitea y pushea las modificaciones, revisa que pase CI CD"
- L2 (decisión): estado `solicitada` en vez de solo filtro por origen, porque el usuario lo sugiere y da zona visible en kanban/tabla/dashboard para ambos roles.

- L3 (checks front): type-check OK, lint 0 errores, test:unit 1533 passed, build OK. Tests ajustados: HomeDashboard cliente espera 3 KPI cards; i18n keys agregadas a los 10 locales.
- L4 (checks back): tests de OT/dashboard/clientViews/export en verde (2459 passed excluyendo .worktrees). Fallos restantes solo en `.worktrees/offline-bootstrap-allowdiskuse` (stale worktree ajeno, fallan también en árbol limpio) + billing flaky bajo carga (pasa aislado).
- L5 (commit+push+CI): front `8a37771` en `feature/onboarding-tour-global` (25 archivos), back `14f1c6e` en `fix/security-audit-residuals-finish` (8 archivos), push OK en ambos. CI de GitHub solo corre en push a main/develop o PR: espejo local en verde (front: lint/type/unit/build; back: unit 2459 passed). PR a main/develop queda a decisión del usuario.
- L6 (review nativa): lineage `review-f3fc032754a20d86` sobre rango commiteado `7877433..HEAD` (25 archivos, 325 líneas, tier medium) — aprobada y acknowledged (authority burned). Lentes risk/readability sin hallazgos; reliability con 3 WARNINGs informativos (R3-001 falso positivo: backend sí usa "plan de mantenimiento" con espacios; R3-002 robustez de filtros cliente; R3-003 cobertura de asserts de dashboard) tratados como trabajo futuro, no correcciones. El candidato gigante rama-vs-main se rechazó por presupuesto (`lens_context_budget_exceeded`).

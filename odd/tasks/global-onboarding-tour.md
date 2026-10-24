# Tour visual global + por sección — Leonix frontGMAO

Header: Usuario nuevo entra y entiende toda la web sin explicación humana. Tour inicial global en Inicio (sin navegar) + mini-tours por sección ya existentes la primera vez que entra a cada una.

## Specs

- S1: Al entrar por primera vez a Inicio (desktop, cualquier rol, autenticado), se auto-lanza UNA vez un recorrido visual global que explica el menú completo sin cambiar de página. Verbatio usuario: "el usuario que apenas entre tenga un recorrido visual por toda la web explicando bien cada cosa, que yo no le tenga que explicar nadaaaaa".
- S2: El tour global cubre: bienvenida, Órdenes de trabajo, Mantenimiento, Instalaciones, Activos, Operación, barra superior (idioma/tema/notificaciones), panel (KPIs/atención/recientes), cierre que avisa que "despues en cada seccion" hay su propio tutorial relanzable. (Cumplimiento oculto del tour y del sidebar por decisión de producto; ruta directa sigue viva.)
- S3: Elección usuario verbatim: primero "Tour único en Inicio", luego corrección verbatim: "No, el tour inicial y despues en cada seccion. O que seria lo recomendado". Decisión: híbrido recomendado (global + seccionales orquestados, sin pisarse).
- S4: No romper los 12 tours por página existentes (driver.js v1.8.0); el global no navega forzado a Configuración, así los seccionales se auto-lanzan solo al visitar su página.
- S5: Relanzable con botón "Ver tutorial", respeta prefers-reduced-motion y tema claro/oscuro, solo desktop (>=1024px), i18n es+en con defaultValue para el resto.

## Tasks

- T1 (S1,S2,S5): servicio central onboarding + useHomeTour global por rol — route: inline — hecho (sin commit, no pedido)
- T2 (S2): anclas data-tour en TopBar + HomeDashboard — route: inline — hecho (sin commit, no pedido)
- T3 (S1,S5): MainLayout dispara una vez para todos los roles + i18n es/en — route: inline — hecho (sin commit, no pedido)
- T4 (S4,S5): test unitario servicio + checks lint/type/test:unit — route: inline — hecho: test:unit 1524 passed, lint 0 errors, type-check OK

## Log

- L1 (verbatim request): "Necesitaria que revises todo el codigo, y revisa las guias turisticas. Necesitaria que el usuario que apenas entre tenga un recorrido visual por toda la web explicando bien cada cosa, que yo no le tenga que explicar nadaaaaa."
- L2 (verbatim elección 1): "Tour único en Inicio"
- L3 (verbatim corrección): "No, el tour inicial y despues en cada seccion. O que seria lo recomendado"
- L4 (decisión): híbrido recomendado — global en Inicio sin navegación forzada + seccionales existentes al visitar cada página.
- L5 (ocultar Cumplimiento): quitar el paso del tour global y ocultar el link del sidebar con flag `SHOW_COMPLIANCE_NAV = false` en Nav.tsx; ruta y keys i18n intactas para reactivarlo.
- L6 (commit+push+CI): commit `2b53b0a` en rama `feature/onboarding-tour-global` (10 archivos, solo estos cambios), push OK. Espejo local del CI en verde: lint 0 errores, type-check OK, unit 1524 passed, integration 19 passed, security 34 passed, build OK. CI de GitHub solo corre en PR a main/develop: pendiente abrir PR.

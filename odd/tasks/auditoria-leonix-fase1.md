# Auditoría Leonix Fase 1 — Corregir lo existente (frontGMAO)

Foco frontend: conectar funciones existentes, eliminar inconsistencias y verificar flujos cliente/admin/técnico. Sin módulos nuevos en esta fase.
Alcance: solo `frontGMAO`; backend (backPanel) notificado a sesiones pares. Evidencia explore: `mvsrqhyp-1-g3gp`.

## Specs

- S1: «Una incidencia puede informar que se guardó aunque localStorage haya fallado»
- S2: «El selector de técnicos no está conectado con la persistencia y generación automática»
- S3: ««Mis solicitudes» puede incluir solicitudes sin autor identificado»
- S4: «El frontend intenta cancelar mediante rutas que no existen para clientes»
- S5: «La fecha preferida se utiliza como fecha programada antes de la aprobación»
- S6: «Se vuelven a consultar los catálogos en cada petición protegida»
- S7: «Hay inconsistencias entre estados y reglas del ciclo de vida» + «workOrderLifecycle.services.js define transiciones estrictas, mientras otras partes del sistema utilizan estados como solicitada y pendiente con lógica propia»
- S8: «establecer un contrato único por operación, con respuestas y códigos de error estables. El frontend no debería probar varias rutas hasta encontrar una que funcione» (subscriptionServices.ts intenta cuatro endpoints diferentes para generar órdenes automáticas)

## Tasks

- T1 (S1, inline, commit): offline incidencias no reporta éxito si persistencia falla — `src/features/**/technicianIncident.ts`, `incidentServices.ts`, `ModalReportIncident.tsx`
- T2 (S2+S8, inline, commit): preventivo persiste técnicos y usa contrato único generación — `subscriptionServices.ts`, `FrequencyForm.tsx`, `ModalEditFrequency.tsx`, `useSubscriptions.ts`
- T3 (S3, inline, commit): Mis solicitudes excluye sin autor — `clientRequestUtils.ts`, `WorkOrders.tsx`
- T4 (S4+S8, inline, commit): cancelación cliente contra ruta única existente — `maintenanceRequestsService.ts`, `clientRequestUtils.ts`, `WorkOrders.tsx`
- T5 (S5, inline, commit): verificar/separar fecha preferida vs programada pre-aprobación — `clientRequestUtils.ts`, `ModalWorkOrderDetails.tsx`, `WorkOrders.tsx`, `WorkOrdersTableView.tsx`, `Calendar.tsx`
- T6 (S6, inline, commit): onboarding no re-consulta por ruta (cache + separar setup de integridad) — `ProtectedRoute.tsx`, `OnboardingGate.tsx`, `useTenantOnboarding.ts`, `tenantOnboardingService.ts`
- T7 (S7, inline, commit): unificar estados/acciones/transiciones órdenes — `clientRequestUtils.ts`, `WorkOrders.tsx`, `KanbanView.tsx`, `ModalWorkOrderDetails.tsx`, `OfflinePackageAction.tsx`, `WorkOrderForm.tsx`, `useWorkOrders.ts`
- T8 (S1+S6, inline, commit): pruebas sincronización y recuperación offline + `bun run lint type-check test:unit`

## Log

- L1 (pedido original verbatim): «Auditoría de Leonix: backPanel + frontPanel Revisé nuevamente la estructura de ambos repositorios, sus dependencias, servicios principales, autenticación por tenant, onboarding, órdenes de trabajo, mantenimiento preventivo, incidencias y funcionamiento offline. Mi conclusión inicial es que Leonix ya tiene una base bastante amplia. No veo necesario agregar muchos módulos nuevos ahora. La prioridad debería ser conectar correctamente las funciones existentes, eliminar inconsistencias y comprobar que los procesos completos funcionen entre cliente, administrador y técnico. [...] Mi orden sería: corregir los seis problemas operativos principales, probar los flujos de extremo a extremo y recién después incorporar nuevas funciones. Alcance de esta revisión: inspeccioné la estructura de ambos repositorios y archivos clave de sus módulos, pero no hice una lectura línea por línea de todos los archivos ni ejecuté la aplicación, los tests o la base de datos. Por eso, los hallazgos concretos están sustentados en código; las mejoras adicionales son recomendaciones y no defectos demostrados.»
- L2 (2026-10-28): explore `mvsrqhyp-1-g3gp` — H1 CONFIRMADO, H3 CONFIRMADO, H4 CONFIRMADO, H7 CONFIRMADO; H2 PARCIAL; H5 NO encontrado en frontend; H6 PARCIAL sin cache entre rutas. Aviso enviado a 4 sesiones pares (3 front/back + 1 back ocupado).
- L3 (T1 S1 DONE): `technicianIncident.ts` save lanza OFFLINE_STORAGE_UNAVAILABLE + verificación read-back; `incidentServices.ts` recordOfflineFallback lanza ante cualquier error (se elimina excepción INSTALLATION_NOT_PREPARED como éxito). Test RED→GREEN `incidentServices.test.ts` «no informa éxito cuando localStorage falla (S1)». type-check OK, lint 0 errores. Peer 01a18471 aparcó su trabajo de incidencias en stash para ceder superficies T1.
- L4 (T2 S2+S8 DONE frontend): `triggerAutomaticWorkOrdersGeneration` solo avanza de ruta ante 404/405; cualquier otro estado o fallo de red lanza de inmediato (contrato único, sin enmascarar). Tests RED→GREEN `subscriptionGeneration.test.ts` (2). Round-trip de técnicos verificado: lectura tolerante (`useSubscriptions.ts` fusiona tecnicosAsignados/tecnicosIds/technicianIds/tecnicoAsignado) + `ModalEditFrequency` rehidrata el selector al reabrir. Campo canónico de escritura y ruta oficial de generación pendientes de respuesta backPanel (mensaje enviado a 01a183f1); escritura triple conservada hasta entonces.
- L5 (T3 S3 DONE frontend): `matchesOwner` excluye solicitudes sin autor cuando hay usuario autenticado (`clientRequestUtils.ts`); antes retornaba true y «Mis solicitudes» incluía ajenas. Test actualizado (el anterior fijaba el defecto como fallback) RED→GREEN (7). Filtro definitivo por autor pendiente del backend.

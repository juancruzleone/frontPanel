# Fix polling, rate limit y CSRF

## Feature
fix-polling-rate-limit-csrf

## Tasks
- [ ] Fix WorkOrders buildFilters debounce y estabilizar deps
- [ ] Evitar doble fetch en useInstallationTypes
- [ ] Romper cascada useForms loadCategories
- [ ] Fix socketService polling y rate limit backoff
- [ ] Corregir offlineSyncService backoff truncado a 50ms
- [ ] Verificar y commit/push todos los cambios

## Context
Logs backPanel muestran CSRF_GUARD_VIOLATION intermitente, rate_limit_exceeded en burst, polling excesivo getInstallationTypes/getAllFormCategories, y logs detallados. Subagents mapearon causas root.

## Acceptance
- WorkOrders no dispara fetch por keystroke sin debounce
- InstallationTypes no hace 2 req/mount innecesarios
- Forms no hace cascada 3 reqs
- Socket polling con backoff/ paginación y manejo 429
- offlineSyncService backoff real no truncado
- Lint 0 errors, tests existentes no rompen

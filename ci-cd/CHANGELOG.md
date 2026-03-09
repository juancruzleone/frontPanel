# Changelog

Todos los cambios notables del proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Sistema completo de seguridad frontend
- Tests unitarios, integración, seguridad y E2E
- CI/CD con GitHub Actions
- Estructura completa de carpeta ci-cd
- Documentación completa de deployment y testing

## [1.0.0] - 2026-03-09

### Added
- Implementación inicial del proyecto
- Sistema de autenticación con JWT
- Dashboard de mantenimiento
- Gestión de órdenes de trabajo
- Sistema de notificaciones
- Modo oscuro/claro

### Security
- Content Security Policy (CSP)
- Headers de seguridad (X-Frame-Options, HSTS, etc)
- Sanitización de inputs
- Protección XSS
- Rate limiting frontend
- Almacenamiento seguro de tokens
- Validación de JWT

### Testing
- 94 tests implementados
- Cobertura > 80%
- Tests de seguridad (XSS, CSRF, Headers)
- Tests E2E con Playwright

### CI/CD
- Pipeline completo de CI
- Deploy automático a Netlify/Vercel
- Security scanning diario
- Performance testing

---

## Tipos de Cambios

- `Added` - Nueva funcionalidad
- `Changed` - Cambios en funcionalidad existente
- `Deprecated` - Funcionalidad que será removida
- `Removed` - Funcionalidad removida
- `Fixed` - Bug fixes
- `Security` - Cambios de seguridad

## Versionado

- **MAJOR** (X.0.0) - Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0) - Nueva funcionalidad compatible
- **PATCH** (0.0.X) - Bug fixes compatibles

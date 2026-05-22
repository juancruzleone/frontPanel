# Estructura de Carpetas del Proyecto

## 📁 Estructura Completa

```
frontGMAO/
├── .github/                          # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml                   # Pipeline principal de CI/CD
│       ├── security-scan.yml        # Escaneo de seguridad diario
│       └── performance.yml          # Tests de performance
│
├── ci-cd/                           # Documentación y scripts de CI/CD
│   ├── README.md                    # Índice de CI/CD
│   ├── CHANGELOG.md                 # Historial de cambios
│   ├── docs/                        # Documentación detallada
│   │   ├── QUICK-START.md          # Inicio rápido (< 5 min)
│   │   ├── SETUP.md                # Setup completo
│   │   ├── DEPLOYMENT.md           # Guía de deployment
│   │   ├── SECRETS.md              # Gestión de secrets
│   │   ├── TESTING.md              # Guía de testing
│   │   └── FOLDER-STRUCTURE.md     # Este archivo
│   ├── scripts/                     # Scripts de automatización
│   │   ├── deploy.sh               # Script de deployment
│   │   ├── health-check.sh         # Health check del sitio
│   │   ├── setup-secrets.sh        # Setup de variables
│   │   └── build-check.sh          # Verificación de build
│   └── templates/                   # Templates de configuración
│       ├── .env.example            # Template de variables
│       └── PR_TEMPLATE.md          # Template de Pull Requests
│
├── public/                          # Assets estáticos
│   ├── _headers                     # Headers de Netlify
│   ├── _redirects                   # Redirects de Netlify
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker
│   └── [imágenes y favicons]
│
├── src/                             # Código fuente
│   ├── components/                  # Componentes reutilizables
│   │   ├── common/                 # Componentes comunes
│   │   ├── layout/                 # Componentes de layout
│   │   └── ui/                     # Componentes UI
│   │
│   ├── features/                    # Features por módulo
│   │   ├── auth/                   # Autenticación
│   │   │   ├── components/        # Componentes de auth
│   │   │   ├── hooks/             # Hooks de auth
│   │   │   ├── services/          # Servicios de auth
│   │   │   └── styles/            # Estilos de auth
│   │   ├── dashboard/              # Dashboard
│   │   ├── orders/                 # Órdenes de trabajo
│   │   └── notifications/          # Notificaciones
│   │
│   ├── services/                    # Servicios y API
│   │   ├── api.ts                  # Cliente API base
│   │   ├── authService.ts          # Servicio de autenticación
│   │   └── secureStorage.ts        # Almacenamiento seguro
│   │
│   ├── utils/                       # Utilidades
│   │   ├── sanitizer.ts            # Sanitización de inputs
│   │   ├── securityHelpers.ts      # Helpers de seguridad
│   │   └── validators.ts           # Validadores
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts              # Hook de autenticación
│   │   ├── useTheme.ts             # Hook de tema
│   │   └── useApi.ts               # Hook de API
│   │
│   ├── types/                       # TypeScript types
│   │   ├── auth.types.ts           # Types de auth
│   │   ├── api.types.ts            # Types de API
│   │   └── common.types.ts         # Types comunes
│   │
│   ├── styles/                      # Estilos globales
│   │   ├── global.css              # Estilos globales
│   │   └── variables.css           # Variables CSS
│   │
│   ├── App.tsx                      # Componente principal
│   ├── main.tsx                     # Entry point
│   └── vite-env.d.ts               # Types de Vite
│
├── tests/                           # Tests
│   ├── setup.ts                     # Setup global de tests
│   ├── unit/                        # Tests unitarios
│   │   ├── sanitizer.test.ts       # Tests de sanitización
│   │   ├── securityHelpers.test.ts # Tests de security helpers
│   │   └── secureStorage.test.ts   # Tests de storage
│   ├── integration/                 # Tests de integración
│   │   └── auth.test.tsx           # Tests de autenticación
│   ├── security/                    # Tests de seguridad
│   │   ├── xss.test.ts             # Tests XSS
│   │   ├── csrf.test.ts            # Tests CSRF
│   │   └── headers.test.ts         # Tests de headers
│   └── e2e/                         # Tests end-to-end
│       ├── login.spec.ts           # Tests de login
│       └── dashboard.spec.ts       # Tests de dashboard
│
├── dist/                            # Build de producción (generado)
│
├── node_modules/                    # Dependencias (generado)
│
├── .env                             # Variables de entorno (NO commitear)
├── .env.example                     # Ejemplo de variables
├── .gitignore                       # Archivos ignorados por Git
├── .npmrc                           # Bloqueo de scripts si alguien usa npm accidentalmente
│
├── index.html                       # HTML principal
├── package.json                     # Dependencias y scripts
├── bun.lock                # Lock de dependencias de Bun
│
├── tsconfig.json                    # Configuración TypeScript
├── tsconfig.app.json                # Config TS para app
├── tsconfig.node.json               # Config TS para Node
│
├── vite.config.ts                   # Configuración de Vite
├── vitest.config.ts                 # Configuración de Vitest
├── playwright.config.ts             # Configuración de Playwright
├── eslint.config.js                 # Configuración de ESLint
│
├── netlify.toml                     # Configuración de Netlify
├── vercel.json                      # Configuración de Vercel
│
├── README.md                        # Documentación principal
├── QUICK_START.md                   # Inicio rápido
├── TESTING_GUIDE.md                 # Guía de testing
├── SECURITY.md                      # Política de seguridad
├── SECURITY_ANALYSIS_FRONTEND.md    # Análisis de seguridad
├── SECURITY_IMPROVEMENTS_APPLIED.md # Mejoras aplicadas
└── RESUMEN_SEGURIDAD.md            # Resumen de seguridad
```

## 📂 Descripción de Carpetas Principales

### `/src` - Código Fuente

**Propósito**: Todo el código fuente de la aplicación.

**Subcarpetas**:
- `components/` - Componentes React reutilizables
- `features/` - Features organizadas por módulo (auth, dashboard, etc)
- `services/` - Servicios de API y lógica de negocio
- `utils/` - Funciones utilitarias y helpers
- `hooks/` - Custom React hooks
- `types/` - Definiciones de tipos TypeScript
- `styles/` - Estilos globales y variables CSS

### `/tests` - Tests

**Propósito**: Todos los tests del proyecto.

**Tipos de tests**:
- `unit/` - Tests de funciones y componentes aislados
- `integration/` - Tests de interacción entre componentes
- `security/` - Tests de vulnerabilidades (XSS, CSRF, etc)
- `e2e/` - Tests de flujos completos de usuario

**Total**: 94 tests con > 80% de cobertura

### `/ci-cd` - CI/CD

**Propósito**: Documentación y scripts de CI/CD.

**Contenido**:
- `docs/` - Documentación detallada (Setup, Deployment, Testing, etc)
- `scripts/` - Scripts de automatización (deploy, health-check, etc)
- `templates/` - Templates de configuración (.env.example, PR template)

### `/.github/workflows` - GitHub Actions

**Propósito**: Workflows de CI/CD automatizados.

**Workflows**:
- `ci.yml` - Pipeline principal (lint, test, build, deploy)
- `security-scan.yml` - Escaneo de seguridad diario
- `performance.yml` - Tests de performance y bundle size

### `/public` - Assets Estáticos

**Propósito**: Archivos estáticos servidos directamente.

**Contenido**:
- Imágenes y favicons
- `manifest.json` - PWA manifest
- `sw.js` - Service Worker
- `_headers` - Headers de Netlify
- `_redirects` - Redirects de Netlify

## 🎯 Convenciones de Nombres

### Archivos

- **Componentes**: PascalCase - `LoginForm.tsx`
- **Utilidades**: camelCase - `sanitizer.ts`
- **Tests**: nombre + `.test.ts` - `sanitizer.test.ts`
- **Estilos**: camelCase + `.module.css` - `loginForm.module.css`
- **Types**: nombre + `.types.ts` - `auth.types.ts`

### Carpetas

- **Features**: camelCase - `auth/`, `dashboard/`
- **Componentes**: camelCase - `common/`, `layout/`
- **Docs**: UPPERCASE - `SETUP.md`, `README.md`

## 📊 Métricas del Proyecto

### Código
- **Líneas de código**: ~15,000
- **Componentes**: ~50
- **Servicios**: ~10
- **Utilidades**: ~20

### Tests
- **Total tests**: 94
- **Cobertura**: > 80%
- **Tiempo ejecución**: < 30s

### Seguridad
- **Vulnerabilidades**: 0 críticas
- **Headers configurados**: 8
- **Sanitización**: Completa

### Performance
- **Bundle size**: < 500KB
- **Lighthouse score**: > 90
- **Load time**: < 2s

## 🔄 Flujo de Trabajo

### Desarrollo

1. Crear rama desde `develop`
2. Hacer cambios en `/src`
3. Agregar tests en `/tests`
4. Ejecutar `bun run test`
5. Ejecutar `bun run lint`
6. Commitear y push
7. Crear Pull Request

### Testing

1. Unit tests: `bun run test:unit`
2. Integration tests: `bun run test:integration`
3. Security tests: `bun run test:security`
4. E2E tests: `bun run test:e2e`

### Deployment

1. Merge a `develop` → Deploy a staging
2. Merge a `main` → Deploy a production
3. GitHub Actions ejecuta pipeline automáticamente

## 📝 Archivos de Configuración

### TypeScript
- `tsconfig.json` - Config base
- `tsconfig.app.json` - Config para app
- `tsconfig.node.json` - Config para Node

### Build Tools
- `vite.config.ts` - Vite (bundler)
- `vitest.config.ts` - Vitest (tests)
- `playwright.config.ts` - Playwright (E2E)

### Linting
- `eslint.config.js` - ESLint

### Deployment
- `netlify.toml` - Netlify
- `vercel.json` - Vercel

## 🔐 Archivos Sensibles

**NUNCA commitear**:
- `.env` - Variables de entorno
- `dist/` - Build de producción
- `node_modules/` - Dependencias
- `coverage/` - Reportes de cobertura
- `.DS_Store` - Archivos de macOS

**Verificar en `.gitignore`**

## 📚 Recursos

- [Estructura de proyecto React](https://react.dev/learn/thinking-in-react)
- [Vite Project Structure](https://vitejs.dev/guide/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

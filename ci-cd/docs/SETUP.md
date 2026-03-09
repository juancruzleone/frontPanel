# Setup del Proyecto Frontend

## Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x
- Git

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/[usuario]/frontGMAO.git
cd frontGMAO
```

### 2. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

> Nota: Se usa `--legacy-peer-deps` debido a conflictos de peer dependencies en algunas librerías.

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Scripts Disponibles

### Desarrollo
- `npm run dev` - Inicia servidor de desarrollo
- `npm run dev:host` - Inicia servidor accesible en red local

### Build
- `npm run build` - Build para producción
- `npm run preview` - Preview del build de producción

### Testing
- `npm test` - Ejecuta todos los tests
- `npm run test:watch` - Tests en modo watch
- `npm run test:ui` - UI interactiva de tests
- `npm run test:coverage` - Tests con coverage
- `npm run test:unit` - Solo tests unitarios
- `npm run test:integration` - Solo tests de integración
- `npm run test:security` - Solo tests de seguridad
- `npm run test:e2e` - Solo tests E2E

### Calidad de Código
- `npm run lint` - Ejecuta ESLint
- `npm run lint:fix` - Corrige errores de linting
- `npm run type-check` - Verifica tipos TypeScript

### Seguridad
- `npm run security:audit` - Auditoría de dependencias
- `npm run security:check` - Verifica vulnerabilidades

### CI/CD
- `npm run ci` - Pipeline completo de CI
- `npm run ci:test` - Tests para CI
- `npm run ci:e2e` - E2E tests para CI

## Estructura del Proyecto

```
frontGMAO/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── features/       # Features por módulo
│   ├── services/       # Servicios y API calls
│   ├── utils/          # Utilidades y helpers
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript types
│   └── App.tsx         # Componente principal
├── tests/
│   ├── unit/           # Tests unitarios
│   ├── integration/    # Tests de integración
│   ├── security/       # Tests de seguridad
│   └── e2e/            # Tests end-to-end
├── public/             # Assets estáticos
├── ci-cd/              # Scripts y docs de CI/CD
└── .github/            # GitHub Actions workflows
```

## Configuración de IDE

### VS Code (Recomendado)

Extensiones recomendadas:
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Vitest

### Configuración de ESLint

El proyecto usa ESLint con configuración personalizada. Los errores se mostrarán automáticamente en el editor.

## Troubleshooting

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 5173 already in use"
```bash
# Cambiar puerto en vite.config.ts o matar el proceso
lsof -ti:5173 | xargs kill -9
```

### Tests fallando
```bash
# Limpiar cache de Vitest
npm run test -- --clearCache
```

## Próximos Pasos

1. Revisar [DEPLOYMENT.md](./DEPLOYMENT.md) para deployment
2. Revisar [SECRETS.md](./SECRETS.md) para manejo de secrets
3. Revisar [TESTING.md](./TESTING.md) para testing

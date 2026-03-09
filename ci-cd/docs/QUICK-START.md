# Quick Start Guide

Guía rápida para empezar a trabajar en el proyecto en menos de 5 minutos.

## 1. Clonar e Instalar (2 min)

```bash
# Clonar
git clone https://github.com/[usuario]/frontGMAO.git
cd frontGMAO

# Instalar
npm install

# Configurar env
cp .env.example .env
```

## 2. Ejecutar en Desarrollo (1 min)

```bash
npm run dev
```

Abre `http://localhost:5173`

## 3. Ejecutar Tests (1 min)

```bash
npm test
```

## 4. Build para Producción (1 min)

```bash
npm run build
npm run preview
```

## Comandos Esenciales

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run dev:host         # Accesible en red local

# Testing
npm test                 # Todos los tests
npm run test:watch       # Tests en watch mode
npm run test:ui          # UI interactiva

# Build
npm run build            # Build producción
npm run preview          # Preview del build

# Calidad
npm run lint             # Linting
npm run type-check       # Type checking
npm run security:audit   # Security audit
```

## Estructura Básica

```
src/
├── components/      # Componentes reutilizables
├── features/        # Features por módulo
│   ├── auth/       # Autenticación
│   ├── dashboard/  # Dashboard
│   └── ...
├── services/        # API y servicios
├── utils/           # Utilidades
└── App.tsx          # App principal

tests/
├── unit/            # Tests unitarios
├── integration/     # Tests integración
├── security/        # Tests seguridad
└── e2e/             # Tests E2E
```

## Workflow de Desarrollo

1. Crear rama desde `develop`:
```bash
git checkout develop
git pull
git checkout -b feature/mi-feature
```

2. Hacer cambios y commitear:
```bash
git add .
git commit -m "feat: descripción del cambio"
```

3. Ejecutar tests:
```bash
npm test
```

4. Push y crear PR:
```bash
git push origin feature/mi-feature
```

## Variables de Entorno

Editar `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## Troubleshooting Rápido

### Puerto ocupado
```bash
# Cambiar puerto en vite.config.ts
# o matar proceso:
lsof -ti:5173 | xargs kill -9
```

### Dependencias rotas
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tests fallando
```bash
npm run test -- --clearCache
```

## Próximos Pasos

- 📖 [SETUP.md](./SETUP.md) - Setup completo
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment
- 🔒 [SECRETS.md](./SECRETS.md) - Manejo de secrets
- 🧪 [TESTING.md](./TESTING.md) - Testing detallado

## Ayuda

- Issues: GitHub Issues
- Docs: `/ci-cd/docs/`
- Tests: `npm run test:ui`

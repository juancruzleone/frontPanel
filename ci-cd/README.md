# 🚀 CI/CD - Integración y Despliegue Continuo Frontend

Esta carpeta contiene toda la configuración de CI/CD para el frontend de Leonix CMMS.

## 📁 Estructura

```
ci-cd/
├── README.md                    # Este archivo
├── scripts/                     # Scripts de automatización
│   ├── deploy.sh               # Deploy manual
│   ├── health-check.sh         # Verificar salud de la app
│   ├── build-check.sh          # Verificar build
│   └── setup-secrets.sh        # Configurar secrets
├── docs/                        # Documentación
│   ├── SETUP.md                # Guía de configuración
│   ├── DEPLOYMENT.md           # Guía de deploy
│   ├── SECRETS.md              # Gestión de secretos
│   ├── TESTING.md              # Guía de testing
│   └── QUICK-START.md          # Inicio rápido
└── templates/                   # Plantillas
    ├── .env.example            # Ejemplo de variables
    └── PR_TEMPLATE.md          # Template de Pull Request
```

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   bun install --ignore-scripts
   ```

2. **Ejecutar tests:**
   ```bash
   bun run test
   ```

3. **Verificar seguridad:**
   ```bash
   bun run security:audit
   ```

4. **Build:**
   ```bash
   bun run build
   ```

## 📚 Documentación

- **[Setup Completo](docs/SETUP.md)** - Configuración paso a paso
- **[Deployment](docs/DEPLOYMENT.md)** - Guía de despliegue
- **[Secrets Management](docs/SECRETS.md)** - Gestión segura de secretos
- **[Testing Guide](docs/TESTING.md)** - Guía completa de testing
- **[Quick Start](docs/QUICK-START.md)** - Inicio rápido en 10 minutos

## 🔐 Seguridad

- ✅ Nunca commitees archivos `.env`
- ✅ Usa GitHub Secrets para información sensible
- ✅ Solo variables con `VITE_` prefix son públicas
- ✅ Ejecuta `bun run security:audit` regularmente

## 🧪 Testing

```bash
# Todos los tests
bun run test

# Por tipo
bun run test:unit
bun run test:integration
bun run test:security
bun run test:e2e

# Con cobertura
bun run test:coverage
```

## 🔄 CI/CD Pipeline

El pipeline se ejecuta automáticamente en:
- Push a `main` o `develop`
- Pull Requests

### Stages:
1. Lint & Type Check
2. Security Audit
3. Unit Tests
4. Integration Tests
5. Security Tests
6. E2E Tests
7. Build
8. Deploy (Staging/Production)

## 🆘 Ayuda

Si tienes problemas, consulta:
- `docs/QUICK-START.md` para inicio rápido
- `docs/TESTING.md` para problemas con tests
- `docs/DEPLOYMENT.md` para problemas de deploy

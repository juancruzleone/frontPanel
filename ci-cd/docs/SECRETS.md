# Gestión de Secrets en Frontend

## ⚠️ IMPORTANTE: Seguridad en Frontend

**El frontend corre en el navegador del usuario. TODO el código y variables son visibles.**

### Reglas de Oro

1. ❌ **NUNCA** guardar secretos en frontend
2. ❌ **NUNCA** commitear archivos `.env`
3. ✅ Solo usar variables públicas (prefijo `VITE_*`)
4. ✅ Todos los secretos deben estar en el backend

## Variables de Entorno

### Variables Públicas (Seguras)

Estas variables son seguras porque son públicas por naturaleza:

```env
# ✅ SEGURO - URL pública de API
VITE_API_URL=https://api.leonix.net.ar

# ✅ SEGURO - Entorno actual
VITE_ENVIRONMENT=production

# ✅ SEGURO - Feature flags públicos
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true

# ✅ SEGURO - Claves públicas de servicios
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
VITE_GOOGLE_MAPS_KEY=AIzaSyXXXXX
```

### Variables Privadas (NUNCA en Frontend)

Estas variables NUNCA deben estar en frontend:

```env
# ❌ PELIGROSO - Secreto de JWT
JWT_SECRET=super_secret_key

# ❌ PELIGROSO - Credenciales de base de datos
DATABASE_URL=postgresql://user:pass@host/db

# ❌ PELIGROSO - API keys privadas
STRIPE_SECRET_KEY=sk_live_xxxxx

# ❌ PELIGROSO - Tokens de servicios
SENDGRID_API_KEY=SG.xxxxx
```

## Configuración por Entorno

### Development

```env
VITE_API_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

### Staging

```env
VITE_API_URL=https://api-staging.leonix.net.ar
VITE_ENVIRONMENT=staging
```

### Production

```env
VITE_API_URL=https://api.leonix.net.ar
VITE_ENVIRONMENT=production
```

## Configuración en Plataformas

### Netlify

1. Dashboard → Site settings → Environment variables
2. Agregar variables con prefijo `VITE_*`
3. Deploy contexts: Production, Deploy previews, Branch deploys

### Vercel

1. Dashboard → Settings → Environment Variables
2. Agregar variables con prefijo `VITE_*`
3. Seleccionar entornos: Production, Preview, Development

### GitHub Actions

En `.github/workflows/ci.yml`:

```yaml
env:
  VITE_API_URL: ${{ secrets.VITE_API_URL }}
  VITE_ENVIRONMENT: production
```

Configurar secrets en:
GitHub → Settings → Secrets and variables → Actions

## Uso en Código

### Acceder a Variables

```typescript
// ✅ Correcto
const apiUrl = import.meta.env.VITE_API_URL

// ✅ Con fallback
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ✅ Type-safe
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Validación de Variables

```typescript
// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  environment: import.meta.env.VITE_ENVIRONMENT,
}

// Validar en startup
if (!config.apiUrl) {
  throw new Error('VITE_API_URL no está configurada')
}
```

## Autenticación Segura

### ✅ Flujo Correcto

1. Usuario hace login en frontend
2. Frontend envía credenciales a backend (HTTPS)
3. Backend valida y genera JWT
4. Backend envía JWT al frontend
5. Frontend guarda JWT en localStorage/sessionStorage
6. Frontend envía JWT en cada request (header Authorization)
7. Backend valida JWT en cada request

### Almacenamiento de Tokens

```typescript
// ✅ Usar servicio de storage seguro
import { secureStorage } from '@/services/secureStorage'

// Guardar token
secureStorage.setToken(token)

// Obtener token
const token = secureStorage.getToken()

// Remover token
secureStorage.removeToken()
```

### Headers de Request

```typescript
// ✅ Incluir token en requests
const response = await fetch(`${apiUrl}/api/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})
```

## Protección de Datos Sensibles

### En Logs

```typescript
import { sanitizeForLogging } from '@/utils/securityHelpers'

// ❌ Peligroso
console.log('User data:', userData)

// ✅ Seguro
console.log('User data:', sanitizeForLogging(userData))
```

### En Error Tracking

```typescript
// ✅ Sanitizar antes de enviar a Sentry
Sentry.captureException(error, {
  extra: sanitizeForLogging(context)
})
```

## Checklist de Seguridad

### Antes de Commitear

- [ ] No hay secretos en código
- [ ] `.env` está en `.gitignore`
- [ ] Solo variables `VITE_*` en código
- [ ] No hay tokens hardcodeados
- [ ] No hay credenciales en comentarios

### Antes de Deployar

- [ ] Variables de entorno configuradas en plataforma
- [ ] Tokens de producción diferentes a desarrollo
- [ ] HTTPS habilitado
- [ ] Headers de seguridad configurados
- [ ] CORS configurado correctamente

### Auditoría Regular

- [ ] Revisar variables de entorno cada mes
- [ ] Rotar tokens cada 3 meses
- [ ] Auditar logs por exposición de datos
- [ ] Verificar que `.env` no está en git history

## Rotación de Secrets

### Cuando Rotar

- Cada 3-6 meses (rutina)
- Después de que un empleado deja la empresa
- Después de una brecha de seguridad
- Cuando un secret se expone accidentalmente

### Cómo Rotar

1. Generar nuevo secret en servicio (ej: Stripe)
2. Actualizar en plataforma de deployment
3. Deploy nueva versión
4. Verificar que funciona
5. Revocar secret antiguo

## Recursos

- [OWASP Frontend Security](https://owasp.org/www-project-web-security-testing-guide/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

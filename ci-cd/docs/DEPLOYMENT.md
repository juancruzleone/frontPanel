# Guía de Deployment

## Script de deployment con auditoría obligatoria

Con Node.js 24 y Bun disponibles, ejecutar desde un árbol de trabajo sin cambios:

```bash
./ci-cd/scripts/deploy.sh staging
# Producción requiere la rama main:
./ci-cd/scripts/deploy.sh production
```

El script ejecuta `bun audit --audit-level=moderate` antes de construir o desplegar.
Cualquier salida no cero, incluidas vulnerabilidades o errores de herramienta/red,
cancela el proceso con código 1 y el mensaje `Auditoría de seguridad falló. Deployment cancelado.`
Corregir la causa y volver a ejecutar; no continuar con un despliegue manual para omitir la auditoría.
Los comandos manuales siguientes usan las mismas versiones fijas del CLI que el script.

## Plataformas Soportadas

- **Netlify** (Recomendado)
- **Vercel**
- **GitHub Pages**
- **Servidor propio**

## Deployment a Netlify

### Configuración Inicial

1. Crear cuenta en [Netlify](https://netlify.com)
2. Conectar repositorio de GitHub
3. Configurar build settings:
   - Build command: `bun run build`
   - Publish directory: `dist`

### Variables de Entorno

En Netlify Dashboard → Site settings → Environment variables:

```
VITE_API_URL=https://api.leonix.net.ar
VITE_ENVIRONMENT=production
```

### Deploy Manual

```bash
# Login con la versión fijada (sin instalación global)
bunx netlify-cli@27.14.2 login

# Deploy (tras completar las verificaciones previas)
bunx netlify-cli@27.14.2 deploy --prod --dir=dist
```

### Deploy Automático

El proyecto está configurado con GitHub Actions para deploy automático:
- Push a `main` → Deploy a producción
- Push a `develop` → Deploy a staging

## Deployment a Vercel

### Configuración Inicial

1. Crear cuenta en [Vercel](https://vercel.com)
2. Importar proyecto desde GitHub
3. Vercel detectará automáticamente la configuración

### Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```
VITE_API_URL=https://api.leonix.net.ar
VITE_ENVIRONMENT=production
```

### Deploy Manual

```bash
# Login con la versión fijada (sin instalación global)
bunx vercel@65.2.0 login

# Deploy (tras completar las verificaciones previas)
bunx vercel@65.2.0 --prod
```

## Deployment a GitHub Pages

### Configuración

1. Habilitar GitHub Pages en Settings → Pages
2. Configurar source: GitHub Actions

### Workflow

El archivo `.github/workflows/deploy-pages.yml` maneja el deployment automático.

## Deployment a Servidor Propio

### Requisitos

- Servidor con Node.js
- Nginx o Apache
- SSL/TLS configurado

### Pasos

1. Build del proyecto:
```bash
bun run build
```

2. Copiar `dist/` al servidor:
```bash
scp -r dist/* user@server:/var/www/html/
```

3. Configurar Nginx:
```nginx
server {
    listen 80;
    server_name leonix.net.ar;
    
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## Verificación Post-Deployment

### 1. Health Check

```bash
./ci-cd/scripts/health-check.sh https://leonix.net.ar
```

### 2. Verificar Headers de Seguridad

```bash
curl -I https://leonix.net.ar
```

Debe incluir:
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Content-Security-Policy`

### 3. Verificar Funcionalidad

- Login funciona
- API calls funcionan
- Assets cargan correctamente
- No hay errores en consola

## Rollback

### Netlify

```bash
# Listar deploys
bunx netlify-cli@27.14.2 deploy:list

# Rollback a deploy anterior
bunx netlify-cli@27.14.2 rollback
```

### Vercel

```bash
# Listar deploys
bunx vercel@65.2.0 ls

# Rollback desde dashboard
# Vercel → Deployments → Promote to Production
```

### GitHub Pages

```bash
# Revertir commit y push
git revert HEAD
git push origin main
```

## Monitoreo

### Logs

- **Netlify**: Dashboard → Deploys → Deploy log
- **Vercel**: Dashboard → Deployments → Function logs
- **Servidor propio**: `tail -f /var/log/nginx/access.log`

### Métricas

- **Lighthouse**: Ejecutar auditoría de performance
- **Bundle size**: Verificar en build output
- **Error tracking**: Configurar Sentry o similar

## Troubleshooting

### Build falla en CI/CD

1. Verificar logs del workflow
2. Ejecutar build localmente: `bun run build`
3. Verificar variables de entorno

### Sitio no carga después de deploy

1. Verificar que `dist/` contiene archivos
2. Verificar configuración de rutas (SPA)
3. Verificar headers de seguridad no bloquean recursos

### API calls fallan

1. Verificar `VITE_API_URL` en variables de entorno
2. Verificar CORS en backend
3. Verificar que API está disponible

## Checklist Pre-Deployment

- [ ] Tests pasan: `bun run test`
- [ ] Build exitoso: `bun run build`
- [ ] Linting sin errores: `bun run lint`
- [ ] Type checking sin errores: `bun run type-check`
- [ ] Security audit exitoso: `bun audit --audit-level=moderate`
- [ ] Variables de entorno configuradas
- [ ] Changelog actualizado
- [ ] Tag de versión creado

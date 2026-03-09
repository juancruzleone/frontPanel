# Guía de Deployment

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
   - Build command: `npm run build`
   - Publish directory: `dist`

### Variables de Entorno

En Netlify Dashboard → Site settings → Environment variables:

```
VITE_API_URL=https://api.leonix.net.ar
VITE_ENVIRONMENT=production
```

### Deploy Manual

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
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
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
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
npm run build
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
netlify deploy:list

# Rollback a deploy anterior
netlify rollback
```

### Vercel

```bash
# Listar deploys
vercel ls

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
2. Ejecutar build localmente: `npm run build`
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

- [ ] Tests pasan: `npm test`
- [ ] Build exitoso: `npm run build`
- [ ] Linting sin errores: `npm run lint`
- [ ] Type checking sin errores: `npm run type-check`
- [ ] Security audit: `npm audit`
- [ ] Variables de entorno configuradas
- [ ] Changelog actualizado
- [ ] Tag de versión creado

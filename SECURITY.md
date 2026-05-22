# 🔒 Política de Seguridad - Leonix CMMS

## 📋 Resumen

Este documento describe las políticas y prácticas de seguridad implementadas en el frontend de Leonix CMMS.

---

## 🛡️ Medidas de Seguridad Implementadas

### 1. Content Security Policy (CSP)
- ✅ CSP configurado en `index.html` y `_headers`
- ✅ Restricción de fuentes de scripts, estilos e imágenes
- ✅ Bloqueo de inline scripts peligrosos
- ✅ Frame-ancestors configurado a 'none'

### 2. Headers de Seguridad
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy configurado
- ✅ HSTS habilitado en producción

### 3. Protección XSS
- ✅ React escapa automáticamente el contenido
- ✅ No se usa `dangerouslySetInnerHTML`
- ✅ Utilidades de sanitización en `src/utils/sanitizer.ts`
- ✅ Validación de URLs y emails

### 4. Gestión de Tokens
- ✅ Tokens JWT almacenados de forma segura
- ✅ Validación de formato JWT
- ✅ Limpieza automática de tokens expirados
- ✅ Storage seguro con `secureStorage.ts`

### 5. Validación de Inputs
- ✅ Yup para validación de formularios
- ✅ Validación en frontend y backend
- ✅ Sanitización de inputs del usuario

### 6. Rate Limiting
- ✅ Rate limiter implementado en `securityHelpers.ts`
- ✅ Debounce y throttle para requests
- ✅ Protección contra abuso de API

### 7. HTTPS
- ✅ Desplegado con HTTPS en Netlify
- ✅ API usa HTTPS
- ✅ Upgrade-insecure-requests en CSP

---

## 🔐 Mejores Prácticas

### Para Desarrolladores

1. **Nunca hardcodear secretos**
   - Usar variables de entorno con prefijo `VITE_`
   - Mantener `.env` en `.gitignore`

2. **Validar todos los inputs**
   - Usar Yup para validación de formularios
   - Sanitizar inputs con `sanitizer.ts`

3. **Usar utilidades de seguridad**
   ```typescript
   import { sanitizeInput, isValidEmail } from '@/utils/sanitizer'
   import { secureStorage } from '@/services/secureStorage'
   ```

4. **No usar innerHTML o dangerouslySetInnerHTML**
   - Preferir siempre JSX de React
   - Si es necesario, usar `sanitizeHtml()`

5. **Implementar rate limiting**
   ```typescript
   import { RateLimiter } from '@/utils/securityHelpers'
   const limiter = new RateLimiter(10, 60000) // 10 requests por minuto
   ```

6. **Sanitizar datos antes de logging**
   ```typescript
   import { sanitizeForLogging } from '@/utils/securityHelpers'
   console.log(sanitizeForLogging(userData))
   ```

---

## 🚨 Reportar Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad:

1. **NO** abras un issue público
2. Envía un email a: security@leonix.net.ar
3. Incluye:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducir
   - Impacto potencial
   - Sugerencias de mitigación (opcional)

Responderemos en un plazo de 48 horas.

---

## 📊 Auditorías de Seguridad

### Auditoría de Dependencias
```bash
# Ejecutar auditoría
bun run security:audit

# Corregir vulnerabilidades automáticamente
bun run security:audit:fix

# Verificar dependencias desactualizadas
bun run security:check
```

### Frecuencia Recomendada
- **Semanal**: Auditoría de dependencias
- **Mensual**: Revisión de headers de seguridad
- **Trimestral**: Auditoría completa de seguridad
- **Anual**: Penetration testing profesional

---

## 🔄 Proceso de Actualización de Dependencias

1. Revisar changelog de la dependencia
2. Ejecutar `bun audit` antes y después
3. Probar en entorno de desarrollo
4. Ejecutar tests E2E
5. Desplegar a staging
6. Monitorear por 24-48 horas
7. Desplegar a producción

---

## 📝 Checklist de Seguridad para PRs

Antes de hacer merge de un PR, verificar:

- [ ] No hay secretos hardcodeados
- [ ] Inputs del usuario están validados
- [ ] No se usa `dangerouslySetInnerHTML` o `innerHTML`
- [ ] URLs externas están sanitizadas
- [ ] Tokens se manejan de forma segura
- [ ] No hay vulnerabilidades en `bun audit`
- [ ] Tests de seguridad pasan
- [ ] Headers de seguridad están configurados
- [ ] CSP no se ha debilitado

---

## 🎯 Roadmap de Seguridad

### Corto Plazo (1-2 meses)
- [ ] Implementar refresh tokens
- [ ] Migrar a cookies HttpOnly
- [ ] Agregar Subresource Integrity (SRI)
- [ ] Implementar logging de seguridad

### Medio Plazo (3-6 meses)
- [ ] Implementar 2FA
- [ ] Agregar rate limiting avanzado
- [ ] Implementar detección de anomalías
- [ ] Certificación de seguridad

### Largo Plazo (6-12 meses)
- [ ] Penetration testing profesional
- [ ] Bug bounty program
- [ ] Certificación ISO 27001
- [ ] Auditoría de seguridad externa

---

## 📚 Recursos

### Documentación
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy](https://content-security-policy.com/)

### Herramientas
- [bun audit](https://bun.com/docs/pm/audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Contacto
- Email de seguridad: security@leonix.net.ar
- Equipo de desarrollo: dev@leonix.net.ar

---

**Última actualización:** 9 de Marzo, 2026
**Versión:** 1.0
**Responsable:** Equipo de Seguridad Leonix

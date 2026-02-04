# 🔍 Encontrar Rutas Hardcodeadas

Este documento te ayuda a identificar todas las rutas hardcodeadas en tu proyecto que necesitan ser actualizadas para usar el sistema de rutas traducidas.

## Patrones a Buscar

### 1. NavLink con rutas hardcodeadas

```tsx
// ❌ Antes (hardcodeado)
<NavLink to="/inicio">Inicio</NavLink>
<NavLink to="/instalaciones">Instalaciones</NavLink>
<NavLink to="/activos">Activos</NavLink>

// ✅ Después (traducido)
const { getRoute } = useTranslatedRoutes();
<NavLink to={getRoute('home')}>Inicio</NavLink>
<NavLink to={getRoute('installations')}>Instalaciones</NavLink>
<NavLink to={getRoute('assets')}>Activos</NavLink>
```

### 2. Link con rutas hardcodeadas

```tsx
// ❌ Antes
<Link to="/instalaciones/123">Ver instalación</Link>

// ✅ Después
const { getRoute } = useTranslatedRoutes();
<Link to={getRoute('installations', { id: '123' })}>Ver instalación</Link>
```

### 3. navigate() con rutas hardcodeadas

```tsx
// ❌ Antes
const navigate = useNavigate();
navigate('/instalaciones');

// ✅ Después
const { navigateToRoute } = useTranslatedRoutes();
navigateToRoute('installations');
```

### 4. Navigate component con rutas hardcodeadas

```tsx
// ❌ Antes
<Navigate to="/inicio" replace />

// ✅ Después
const { getRoute } = useTranslatedRoutes();
<Navigate to={getRoute('home')} replace />
```

## Comandos de Búsqueda

### Buscar en VS Code

Usa la búsqueda global (Ctrl+Shift+F o Cmd+Shift+F) con estas expresiones regulares:

```regex
to="\/[a-z-]+"
navigate\("\/[a-z-]+"\)
```

### Buscar con grep (Linux/Mac)

```bash
# Buscar NavLink y Link con rutas
grep -r 'to="/' src/

# Buscar navigate con rutas
grep -r 'navigate("/' src/

# Buscar Navigate component con rutas
grep -r '<Navigate to="/' src/
```

### Buscar con PowerShell (Windows)

```powershell
# Buscar en todos los archivos .tsx y .ts
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String -Pattern 'to="/'

# Buscar navigate
Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String -Pattern 'navigate\("/'
```

## Archivos Identificados que Necesitan Actualización

Basado en el análisis del código, estos archivos contienen rutas hardcodeadas:

### ✅ Ya Actualizados

- [x] `src/router/ProtectedRoute.tsx`
- [x] `src/router/RedirectIfLoggedIn.tsx`
- [x] `src/router/RoleProtectedRoute.tsx`

### 🔄 Pendientes de Actualizar

- [ ] `src/shared/components/Nav/Nav.tsx` - **PRIORIDAD ALTA**
  - Contiene múltiples NavLink con rutas hardcodeadas
  - Es el componente de navegación principal

- [ ] Buscar en `src/pages/` componentes que usen:
  - `navigate('/ruta')`
  - `<Link to="/ruta">`
  - `<Navigate to="/ruta">`

- [ ] Buscar en `src/components/` componentes que usen navegación

- [ ] Buscar en `src/features/` componentes que usen navegación

## Mapa de Conversión de Rutas

Usa esta tabla para convertir rutas hardcodeadas a keys:

| Ruta Hardcodeada | Key para getRoute() |
|------------------|---------------------|
| `/inicio` | `'home'` |
| `/instalaciones` | `'installations'` |
| `/instalaciones/:id` | `'installations', { id }` |
| `/perfil` | `'profile'` |
| `/perfil/:userId` | `'profile', { userId }` |
| `/panel-admin` | `'panelAdmin'` |
| `/tenants` | `'tenants'` |
| `/activos` | `'assets'` |
| `/calendario` | `'calendar'` |
| `/formularios` | `'forms'` |
| `/personal` | `'personal'` |
| `/clientes` | `'clients'` |
| `/manuales` | `'manuals'` |
| `/abonos-vigentes` | `'subscriptions'` |
| `/ordenes-trabajo` | `'workOrders'` |
| `/formulario-interno/:installationId/:deviceId` | `'internalForm', { installationId, deviceId }` |
| `/dispositivo/:installationId/:deviceId` | `'device', { installationId, deviceId }` |
| `/formulario/:installationId/:deviceId` | `'form', { installationId, deviceId }` |

## Proceso de Actualización Recomendado

### Paso 1: Identificar el archivo

Usa las búsquedas anteriores para encontrar archivos con rutas hardcodeadas.

### Paso 2: Importar el hook

```tsx
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';
```

### Paso 3: Usar el hook en el componente

```tsx
function MyComponent() {
  const { getRoute, navigateToRoute } = useTranslatedRoutes();
  
  // ... resto del componente
}
```

### Paso 4: Reemplazar rutas

Usa la tabla de conversión para reemplazar cada ruta hardcodeada.

### Paso 5: Probar

1. Verifica que el componente compile sin errores
2. Prueba la navegación en la aplicación
3. Cambia el idioma y verifica que las URLs se actualicen

## Ejemplo Completo de Actualización

### Antes

```tsx
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

function Nav() {
  const navigate = useNavigate();
  
  const handleGoHome = () => {
    navigate('/inicio');
  };
  
  return (
    <nav>
      <NavLink to="/inicio">Inicio</NavLink>
      <NavLink to="/instalaciones">Instalaciones</NavLink>
      <NavLink to="/activos">Activos</NavLink>
      <button onClick={handleGoHome}>Ir al inicio</button>
    </nav>
  );
}
```

### Después

```tsx
import { NavLink } from 'react-router-dom';
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';

function Nav() {
  const { getRoute, navigateToRoute } = useTranslatedRoutes();
  
  const handleGoHome = () => {
    navigateToRoute('home');
  };
  
  return (
    <nav>
      <NavLink to={getRoute('home')}>Inicio</NavLink>
      <NavLink to={getRoute('installations')}>Instalaciones</NavLink>
      <NavLink to={getRoute('assets')}>Activos</NavLink>
      <button onClick={handleGoHome}>Ir al inicio</button>
    </nav>
  );
}
```

## Verificación Final

Después de actualizar todos los archivos:

```bash
# Buscar si quedan rutas hardcodeadas (debería devolver 0 o solo rutas públicas)
grep -r 'to="/[a-z]' src/ | grep -v 'to="/"' | grep -v 'dispositivo' | grep -v 'formulario'
```

Las únicas rutas hardcodeadas que deberían quedar son:
- `to="/"` (login)
- `/dispositivo/:id` (rutas públicas de QR)
- `/formulario/:id` (rutas públicas de QR)

## Notas Importantes

1. **No actualices las rutas públicas**: Las rutas `/dispositivo/` y `/formulario/` deben mantenerse hardcodeadas para compatibilidad con QR codes existentes.

2. **Rutas con múltiples parámetros**: Para rutas como `/formulario-interno/:installationId/:deviceId`, pasa todos los parámetros:
   ```tsx
   getRoute('internalForm', { installationId: '123', deviceId: '456' })
   ```

3. **Prueba en todos los idiomas**: Después de actualizar, prueba la navegación en al menos 2-3 idiomas diferentes.

4. **TypeScript te ayudará**: Si usas un key incorrecto, TypeScript te mostrará un error.

## ¿Necesitas Ayuda?

Consulta:
- `src/router/ExampleUsage.tsx` - 10 ejemplos prácticos
- `src/router/MIGRATION_GUIDE.md` - Guía detallada de migración
- `src/router/README.md` - Documentación técnica completa

# Guía de Migración - Rutas Traducidas

Esta guía te ayudará a actualizar tus componentes existentes para usar el nuevo sistema de rutas traducidas.

## Paso 1: Actualizar Componentes de Navegación

### Antes (rutas hardcodeadas):

```tsx
import { NavLink } from 'react-router-dom';

function Nav() {
  return (
    <nav>
      <NavLink to="/inicio">Inicio</NavLink>
      <NavLink to="/instalaciones">Instalaciones</NavLink>
      <NavLink to="/activos">Activos</NavLink>
    </nav>
  );
}
```

### Después (rutas traducidas):

```tsx
import { NavLink } from 'react-router-dom';
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';

function Nav() {
  const { getRoute } = useTranslatedRoutes();
  
  return (
    <nav>
      <NavLink to={getRoute('home')}>Inicio</NavLink>
      <NavLink to={getRoute('installations')}>Instalaciones</NavLink>
      <NavLink to={getRoute('assets')}>Activos</NavLink>
    </nav>
  );
}
```

## Paso 2: Actualizar Navegación Programática

### Antes:

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/instalaciones');
  };
  
  return <button onClick={handleClick}>Ver instalaciones</button>;
}
```

### Después:

```tsx
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';

function MyComponent() {
  const { navigateToRoute } = useTranslatedRoutes();
  
  const handleClick = () => {
    navigateToRoute('installations');
  };
  
  return <button onClick={handleClick}>Ver instalaciones</button>;
}
```

## Paso 3: Actualizar Redirecciones

### Antes:

```tsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute() {
  if (!isAuthenticated) {
    return <Navigate to="/inicio" replace />;
  }
  
  return <Outlet />;
}
```

### Después:

```tsx
import { Navigate } from 'react-router-dom';
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';

function ProtectedRoute() {
  const { getRoute } = useTranslatedRoutes();
  
  if (!isAuthenticated) {
    return <Navigate to={getRoute('home')} replace />;
  }
  
  return <Outlet />;
}
```

## Paso 4: Actualizar Rutas con Parámetros

### Antes:

```tsx
function InstallationsList() {
  const navigate = useNavigate();
  
  const viewDetails = (id: string) => {
    navigate(`/instalaciones/${id}`);
  };
  
  return (
    <div>
      {installations.map(inst => (
        <button key={inst.id} onClick={() => viewDetails(inst.id)}>
          Ver detalles
        </button>
      ))}
    </div>
  );
}
```

### Después:

```tsx
function InstallationsList() {
  const { navigateToRoute } = useTranslatedRoutes();
  
  const viewDetails = (id: string) => {
    navigateToRoute('installations', { id });
  };
  
  return (
    <div>
      {installations.map(inst => (
        <button key={inst.id} onClick={() => viewDetails(inst.id)}>
          Ver detalles
        </button>
      ))}
    </div>
  );
}
```

## Paso 5: Actualizar Links con Parámetros

### Antes:

```tsx
function InstallationCard({ id }: { id: string }) {
  return (
    <Link to={`/instalaciones/${id}`}>
      Ver instalación
    </Link>
  );
}
```

### Después:

```tsx
function InstallationCard({ id }: { id: string }) {
  const { getRoute } = useTranslatedRoutes();
  
  return (
    <Link to={getRoute('installations', { id })}>
      Ver instalación
    </Link>
  );
}
```

## Archivos que Necesitan Actualización

Basado en el análisis del código, estos son los archivos principales que necesitan actualización:

### 1. `src/shared/components/Nav/Nav.tsx`
- Actualizar todos los `NavLink` con `to` hardcodeado
- Usar `getRoute()` para cada ruta

### 2. `src/router/ProtectedRoute.tsx`
- Actualizar `<Navigate to="/inicio" replace />` 
- Usar `getRoute('home')`

### 3. `src/router/RedirectIfLoggedIn.tsx`
- Actualizar `<Navigate to="/instalaciones" replace />`
- Usar `getRoute('installations')`

### 4. `src/router/RoleProtectedRoute.tsx`
- Actualizar `<Navigate to="/inicio" replace />`
- Usar `getRoute('home')`

### 5. Cualquier componente que use:
- `navigate('/ruta')`
- `<Link to="/ruta">`
- `<NavLink to="/ruta">`
- `<Navigate to="/ruta">`

## Ejemplo Completo: Actualizar Nav.tsx

```tsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTranslatedRoutes } from '../../router/useTranslatedRoutes';
import { Home, Building, Package, Calendar, FileText, BookOpen, Users, CreditCard, ClipboardList } from 'lucide-react';
import styles from './Nav.module.css';

function Nav() {
  const { t } = useTranslation();
  const { getRoute } = useTranslatedRoutes();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <nav className={styles.nav}>
      <ul>
        <li>
          <NavLink 
            to={getRoute('home')} 
            className={({ isActive }) => (isActive ? styles.active : "")} 
            onClick={() => setIsMenuOpen(false)}
          >
            <Home size={20} /> 
            <span className={styles.linkText}>{t('nav.home')}</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to={getRoute('installations')} 
            className={({ isActive }) => (isActive ? styles.active : "")} 
            onClick={() => setIsMenuOpen(false)}
          >
            <Building size={20} /> 
            <span className={styles.linkText}>{t('nav.installations')}</span>
          </NavLink>
        </li>
        <li>
          <NavLink 
            to={getRoute('assets')} 
            className={({ isActive }) => (isActive ? styles.active : "")} 
            onClick={() => setIsMenuOpen(false)}
          >
            <Package size={20} /> 
            <span className={styles.linkText}>{t('nav.assets')}</span>
          </NavLink>
        </li>
        {/* ... más rutas */}
      </ul>
    </nav>
  );
}

export default Nav;
```

## Verificación

Después de actualizar tus componentes:

1. ✅ Cambia el idioma en la aplicación
2. ✅ Verifica que las URLs se actualicen automáticamente
3. ✅ Navega entre páginas y confirma que funciona correctamente
4. ✅ Prueba con diferentes idiomas (es, en, fr, pt, etc.)
5. ✅ Verifica que los parámetros de ruta se mantengan

## Beneficios

- ✨ URLs amigables en el idioma del usuario
- ✨ Mejor SEO con URLs localizadas
- ✨ Experiencia de usuario mejorada
- ✨ Mantenimiento centralizado de rutas
- ✨ Tipado completo con TypeScript
- ✨ Sin necesidad de archivos separados por idioma

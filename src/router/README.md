# Sistema de Rutas Traducidas Dinámicamente

Este sistema permite que todas las rutas de la aplicación se traduzcan automáticamente según el idioma seleccionado por el usuario, sin necesidad de crear archivos separados para cada idioma.

## Características

- ✅ Traducción automática de rutas al cambiar de idioma
- ✅ Soporte para 10 idiomas (es, en, fr, pt, de, it, ja, ko, zh, ar)
- ✅ Navegación programática con rutas traducidas
- ✅ Actualización automática de la URL al cambiar el idioma
- ✅ Compatibilidad con rutas públicas (QR codes)
- ✅ Manejo de parámetros dinámicos (:id, :userId, etc.)

## Archivos del Sistema

### 1. `routeTranslations.ts`
Contiene todas las traducciones de las rutas para cada idioma soportado.

### 2. `useTranslatedRoutes.ts`
Hook personalizado que proporciona funciones para trabajar con rutas traducidas.

### 3. `createTranslatedRouter.tsx`
Genera automáticamente todas las rutas para todos los idiomas.

## Uso en Componentes

### Importar el hook

```tsx
import { useTranslatedRoutes } from '../router/useTranslatedRoutes';
```

### Obtener una ruta traducida

```tsx
function MyComponent() {
  const { getRoute } = useTranslatedRoutes();
  
  // Ruta simple
  const homeRoute = getRoute('home'); // "/inicio" en español, "/home" en inglés
  
  // Ruta con parámetros
  const installationRoute = getRoute('installations', { id: '123' }); 
  // "/instalaciones/123" en español, "/installations/123" en inglés
  
  return (
    <Link to={homeRoute}>Ir al inicio</Link>
  );
}
```

### Navegar programáticamente

```tsx
function MyComponent() {
  const { navigateToRoute } = useTranslatedRoutes();
  
  const handleClick = () => {
    // Navegar a una ruta simple
    navigateToRoute('home');
    
    // Navegar con parámetros
    navigateToRoute('installations', { id: '123' });
  };
  
  return <button onClick={handleClick}>Ir a instalaciones</button>;
}
```

### Obtener el idioma actual

```tsx
function MyComponent() {
  const { currentLang } = useTranslatedRoutes();
  
  return <div>Idioma actual: {currentLang}</div>;
}
```

## Rutas Disponibles

| Key | Español | Inglés | Francés | Portugués |
|-----|---------|--------|---------|-----------|
| home | inicio | home | accueil | inicio |
| installations | instalaciones | installations | installations | instalacoes |
| profile | perfil | profile | profil | perfil |
| panelAdmin | panel-admin | admin-panel | panneau-admin | painel-admin |
| assets | activos | assets | actifs | ativos |
| calendar | calendario | calendar | calendrier | calendario |
| forms | formularios | forms | formulaires | formularios |
| personal | personal | staff | personnel | pessoal |
| clients | clientes | clients | clients | clientes |
| manuals | manuales | manuals | manuels | manuais |
| subscriptions | abonos-vigentes | subscriptions | abonnements | assinaturas |
| workOrders | ordenes-trabajo | work-orders | ordres-travail | ordens-trabalho |
| internalForm | formulario-interno | internal-form | formulaire-interne | formulario-interno |
| device | dispositivo | device | appareil | dispositivo |
| form | formulario | form | formulaire | formulario |

## Agregar Nuevas Rutas

1. Abre `src/router/routeTranslations.ts`
2. Agrega la nueva clave y sus traducciones en todos los idiomas:

```typescript
export const routeTranslations = {
  es: {
    // ... rutas existentes
    newRoute: 'nueva-ruta',
  },
  en: {
    // ... rutas existentes
    newRoute: 'new-route',
  },
  // ... otros idiomas
};
```

3. Abre `src/router/createTranslatedRouter.tsx`
4. Agrega la nueva ruta en la función `generateRoutesForAllLanguages`:

```typescript
{
  path: `/${t.newRoute}`,
  element: (
    <ProtectedRoute>
      <MainLayout>
        <NewComponent />
      </MainLayout>
    </ProtectedRoute>
  ),
}
```

## Comportamiento Automático

Cuando el usuario cambia el idioma:
1. El hook detecta el cambio automáticamente
2. Busca la ruta actual en las traducciones
3. Actualiza la URL con la nueva traducción
4. Mantiene los parámetros dinámicos intactos

Ejemplo:
- Usuario está en: `/instalaciones/123` (español)
- Cambia a inglés
- La URL se actualiza a: `/installations/123`

## Compatibilidad con Rutas Antiguas

Las rutas públicas como `/dispositivo/:id` y `/formulario/:id` se mantienen sin traducir para garantizar la compatibilidad con QR codes existentes.

## Notas Importantes

- Las rutas se actualizan automáticamente al cambiar el idioma
- No es necesario recargar la página
- Los parámetros de ruta se preservan durante la traducción
- El sistema es completamente tipado con TypeScript

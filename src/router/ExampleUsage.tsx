/**
 * EJEMPLO DE USO - Sistema de Rutas Traducidas
 * 
 * Este archivo muestra ejemplos prácticos de cómo usar el sistema de rutas traducidas
 * en diferentes escenarios comunes.
 */

import { Link, NavLink } from 'react-router';
import { useTranslatedRoutes } from './useTranslatedRoutes';

// ============================================================================
// EJEMPLO 1: Navegación Simple con Links
// ============================================================================
export function SimpleNavigationExample() {
  const { getRoute } = useTranslatedRoutes();

  return (
    <nav>
      <Link to={getRoute('home')}>Inicio</Link>
      <Link to={getRoute('installations')}>Instalaciones</Link>
      <Link to={getRoute('assets')}>Activos</Link>
      <Link to={getRoute('calendar')}>Calendario</Link>
    </nav>
  );
}

// ============================================================================
// EJEMPLO 2: NavLink con clases activas
// ============================================================================
export function NavLinkExample() {
  const { getRoute } = useTranslatedRoutes();

  return (
    <nav>
      <NavLink 
        to={getRoute('home')} 
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Inicio
      </NavLink>
      <NavLink 
        to={getRoute('installations')} 
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Instalaciones
      </NavLink>
    </nav>
  );
}

// ============================================================================
// EJEMPLO 3: Navegación Programática
// ============================================================================
export function ProgrammaticNavigationExample() {
  const { navigateToRoute } = useTranslatedRoutes();

  const handleGoHome = () => {
    navigateToRoute('home');
  };

  const handleGoToInstallations = () => {
    navigateToRoute('installations');
  };

  return (
    <div>
      <button onClick={handleGoHome}>Ir al Inicio</button>
      <button onClick={handleGoToInstallations}>Ver Instalaciones</button>
    </div>
  );
}

// ============================================================================
// EJEMPLO 4: Rutas con Parámetros
// ============================================================================
export function RouteWithParamsExample() {
  const { getRoute, navigateToRoute } = useTranslatedRoutes();

  const installations = [
    { id: '1', name: 'Instalación A' },
    { id: '2', name: 'Instalación B' },
    { id: '3', name: 'Instalación C' },
  ];

  const handleViewDetails = (id: string) => {
    // Navegar programáticamente con parámetros
    navigateToRoute('installations', { id });
  };

  return (
    <div>
      <h2>Lista de Instalaciones</h2>
      {installations.map(inst => (
        <div key={inst.id}>
          {/* Opción 1: Link con parámetros */}
          <Link to={getRoute('installations', { id: inst.id })}>
            {inst.name}
          </Link>
          
          {/* Opción 2: Botón con navegación programática */}
          <button onClick={() => handleViewDetails(inst.id)}>
            Ver detalles
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EJEMPLO 5: Obtener el idioma actual
// ============================================================================
export function CurrentLanguageExample() {
  const { currentLang } = useTranslatedRoutes();

  return (
    <div>
      <p>Idioma actual: {currentLang}</p>
      <p>Las rutas se mostrarán en: {currentLang === 'es' ? 'Español' : currentLang === 'en' ? 'English' : currentLang}</p>
    </div>
  );
}

// ============================================================================
// EJEMPLO 6: Menú de Navegación Completo
// ============================================================================
export function CompleteNavigationMenuExample() {
  const { getRoute, currentLang } = useTranslatedRoutes();

  const menuItems = [
    { key: 'home', label: 'Inicio', icon: '🏠' },
    { key: 'installations', label: 'Instalaciones', icon: '🏢' },
    { key: 'assets', label: 'Activos', icon: '📦' },
    { key: 'calendar', label: 'Calendario', icon: '📅' },
    { key: 'forms', label: 'Formularios', icon: '📝' },
    { key: 'manuals', label: 'Manuales', icon: '📚' },
    { key: 'workOrders', label: 'Órdenes de Trabajo', icon: '📋' },
  ];

  return (
    <nav>
      <div>Idioma: {currentLang}</div>
      <ul>
        {menuItems.map(item => (
          <li key={item.key}>
            <NavLink 
              to={getRoute(item.key as any)}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// EJEMPLO 7: Breadcrumbs con rutas traducidas
// ============================================================================
export function BreadcrumbsExample({ installationId }: { installationId?: string }) {
  const { getRoute } = useTranslatedRoutes();

  return (
    <nav aria-label="breadcrumb">
      <ol>
        <li>
          <Link to={getRoute('home')}>Inicio</Link>
        </li>
        <li>
          <Link to={getRoute('installations')}>Instalaciones</Link>
        </li>
        {installationId && (
          <li>
            <Link to={getRoute('installations', { id: installationId })}>
              Detalle
            </Link>
          </li>
        )}
      </ol>
    </nav>
  );
}

// ============================================================================
// EJEMPLO 8: Redirección condicional
// ============================================================================
export function ConditionalRedirectExample({ userRole }: { userRole: string }) {
  const { navigateToRoute } = useTranslatedRoutes();

  const handleLogin = () => {
    // Redirigir según el rol del usuario
    if (userRole === 'admin') {
      navigateToRoute('panelAdmin');
    } else if (userRole === 'technician') {
      navigateToRoute('workOrders');
    } else {
      navigateToRoute('home');
    }
  };

  return (
    <button onClick={handleLogin}>
      Iniciar Sesión
    </button>
  );
}

// ============================================================================
// EJEMPLO 9: Tarjeta con múltiples acciones
// ============================================================================
export function InstallationCardExample({ 
  id, 
  name, 
  address 
}: { 
  id: string; 
  name: string; 
  address: string; 
}) {
  const { getRoute, navigateToRoute } = useTranslatedRoutes();

  const handleEdit = () => {
    navigateToRoute('installations', { id });
  };

  const handleViewDevices = () => {
    // Navegar a una sub-ruta
    navigateToRoute('installations', { id });
  };

  return (
    <div className="card">
      <h3>{name}</h3>
      <p>{address}</p>
      
      {/* Link directo */}
      <Link to={getRoute('installations', { id })}>
        Ver detalles
      </Link>
      
      {/* Botones con navegación programática */}
      <button onClick={handleEdit}>Editar</button>
      <button onClick={handleViewDevices}>Ver dispositivos</button>
    </div>
  );
}

// ============================================================================
// EJEMPLO 10: Formulario con redirección después de guardar
// ============================================================================
export function FormWithRedirectExample() {
  const { navigateToRoute } = useTranslatedRoutes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Guardar datos...
      await saveData();
      
      // Redirigir después de guardar exitosamente
      navigateToRoute('installations');
    } catch (error) {
      // Error al guardar
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      <button type="submit">Guardar</button>
      <button 
        type="button" 
        onClick={() => navigateToRoute('installations')}
      >
        Cancelar
      </button>
    </form>
  );
}

// Función auxiliar de ejemplo
async function saveData() {
  // Simulación de guardado
  return new Promise(resolve => setTimeout(resolve, 1000));
}

export default {
  SimpleNavigationExample,
  NavLinkExample,
  ProgrammaticNavigationExample,
  RouteWithParamsExample,
  CurrentLanguageExample,
  CompleteNavigationMenuExample,
  BreadcrumbsExample,
  ConditionalRedirectExample,
  InstallationCardExample,
  FormWithRedirectExample,
};

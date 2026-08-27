import { createBrowserRouter, RouteObject } from "react-router";
import { routeTranslations, type Language } from './routeTranslations';

// Importar componentes
import Login from "../pages/Login";
import Register from "../pages/Register";
import Installations from "../pages/Installations";
import InstallationDetails from "../pages/InstallationsDetails";
import Assets from "../pages/Assets.tsx";
import Inventory from "../pages/Inventory.tsx";
import Forms from "../pages/Forms.tsx";
import Manuals from "../pages/Manuals.tsx";
import Suppliers from "../pages/Suppliers.tsx";
import Subscriptions from "../pages/Subscriptions.tsx";
import WorkOrders from "../pages/WorkOrders.tsx";
import Calendar from "../pages/Calendar.tsx";
import DeviceFormPage from "../pages/DeviceFormPage";
import PublicDeviceViewPage from "../pages/PublicDeviceViewPage";
import FormularioRedirect from "../pages/FormularioRedirect";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import RedirectIfLogged from "./RedirectIfLoggedIn.tsx";
import Home from "../pages/Home";
import Profile from '../pages/Profile';
import UserProfile from '../pages/UserProfile';
import PanelAdmin from '../pages/PanelAdmin';
import NotFound from '../pages/NotFound';
import Tenants from '../pages/Tenants';
import Clients from '../pages/Clients';
import Settings from '../pages/Settings';
import AuditLogs from '../pages/AuditLogs';
import Compliance from '../pages/Compliance';
import { ROLES } from "../shared/utils/roleUtils";

/**
 * Genera rutas hijas para MainLayout para todos los idiomas
 */
const generateChildRoutesForAllLanguages = (): RouteObject[] => {
  const languages = Object.keys(routeTranslations) as Language[];
  const routes: RouteObject[] = [];

  languages.forEach(lang => {
    const t = routeTranslations[lang];

    // Rutas protegidas dentro de MainLayout
    routes.push(
      // Home
      {
        path: t.home,
        element: <RoleProtectedRoute section="inicio"><Home /></RoleProtectedRoute>,
      },
      // Instalaciones
      {
        path: t.installations,
        element: <RoleProtectedRoute section="instalaciones"><Installations /></RoleProtectedRoute>,
      },
      // Instalación detalle
      {
        path: `${t.installations}/:id`,
        element: <RoleProtectedRoute section="instalaciones"><InstallationDetails /></RoleProtectedRoute>,
      },
      // Perfil
      {
        path: t.profile,
        element: <RoleProtectedRoute section="perfil"><Profile /></RoleProtectedRoute>,
      },
      // Activos
      {
        path: t.assets,
        element: <RoleProtectedRoute section="activos"><Assets /></RoleProtectedRoute>,
      },
      // Inventario
      {
        path: t.inventory,
        element: <RoleProtectedRoute section="inventario"><Inventory /></RoleProtectedRoute>,
      },
      // Proveedores
      {
        path: t.suppliers,
        element: <RoleProtectedRoute section="proveedores"><Suppliers /></RoleProtectedRoute>,
      },
      // Calendario
      {
        path: t.calendar,
        element: <RoleProtectedRoute section="calendario"><Calendar /></RoleProtectedRoute>,
      },
      // Manuales
      {
        path: t.manuals,
        element: <Manuals />,
      },
      // Configuración
      {
        path: t.settings,
        element: <RoleProtectedRoute section="configuracion"><Settings /></RoleProtectedRoute>,
      },
      // Cumplimiento normativo (admin escribe, técnico lee y dispara escaneos)
      {
        path: t.compliance,
        element: <RoleProtectedRoute section="cumplimiento"><Compliance /></RoleProtectedRoute>,
      }
    );
  });

  return routes;
};

/**
 * Genera rutas para roles específicos (admin, super_admin, etc.)
 */
export const generateRoleSpecificRoutes = (): RouteObject[] => {
  const languages = Object.keys(routeTranslations) as Language[];
  const routes: RouteObject[] = [];

  languages.forEach(lang => {
    const t = routeTranslations[lang];

    // Rutas solo para super_admin
    routes.push(
      {
        path: t.panelAdmin,
        element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><PanelAdmin /></ProtectedRoute>,
      },
      {
        path: t.tenants,
        element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Tenants /></ProtectedRoute>,
      },
      {
        path: t.audit,
        element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}><AuditLogs /></ProtectedRoute>,
      }
    );

    // Rutas solo para admin
    routes.push(
      {
        path: t.forms,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Forms /></ProtectedRoute>,
      },
      {
        path: t.personal,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Register /></ProtectedRoute>,
      },
      {
        path: t.clients,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Clients /></ProtectedRoute>,
      },
      {
        path: `${t.profile}/:userId`,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><UserProfile /></ProtectedRoute>,
      },
      {
        path: t.subscriptions,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Subscriptions /></ProtectedRoute>,
      },
      {
        path: t.maintenancePlan,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]}><Subscriptions /></ProtectedRoute>,
      },
    );

    // Rutas para admin y técnicos
    routes.push(
      {
        path: t.workOrders,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.TECHNICIAN_ALT]}><WorkOrders /></ProtectedRoute>,
      },
      {
        path: `${t.internalForm}/:installationId/:deviceId`,
        element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.TECHNICIAN_ALT]}><DeviceFormPage /></ProtectedRoute>,
      }
    );
  });

  return routes;
};

/**
 * Genera rutas públicas para todos los idiomas
 */
const generatePublicRoutes = (): RouteObject[] => {
  const languages = Object.keys(routeTranslations) as Language[];
  const routes: RouteObject[] = [];

  languages.forEach(lang => {
    const t = routeTranslations[lang];

    routes.push(
      {
        path: `${t.device}/:installationId/:deviceId`,
        element: <PublicDeviceViewPage />,
      },
      {
        path: `${t.form}/:installationId/:deviceId`,
        element: <FormularioRedirect />,
      }
    );
  });

  return routes;
};

/**
 * Crea el router con todas las rutas traducidas
 */
export const createTranslatedRouter = () => {
  const childRoutes = generateChildRoutesForAllLanguages();
  const roleRoutes = generateRoleSpecificRoutes();
  const publicRoutes = generatePublicRoutes();

  return createBrowserRouter([
    // Rutas públicas sin traducción (mantener compatibilidad con QR antiguos)
    {
      path: "/dispositivo/:installationId/:deviceId",
      element: <PublicDeviceViewPage />,
    },
    {
      path: "/formulario/:installationId/:deviceId",
      element: <FormularioRedirect />,
    },
    // Rutas públicas traducidas
    ...publicRoutes,
    // Login (redirige si está logueado)
    {
      element: <RedirectIfLogged />,
      children: [
        {
          path: "/",
          element: <Login />,
        },
      ],
    },
    // Rutas protegidas con MainLayout
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <MainLayout />,
          children: [
            // Rutas comunes
            ...childRoutes,
            // Rutas específicas por rol
            ...roleRoutes,
            // 404
            {
              path: "*",
              element: <NotFound />,
            },
          ],
        },
      ],
    },
  ]);
};

export const router = createTranslatedRouter();

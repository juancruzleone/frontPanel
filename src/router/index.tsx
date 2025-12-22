import { createBrowserRouter } from "react-router-dom"
import Login from "../pages/Login"
import Register from "../pages/Register"
import Installations from "../pages/Installations"
import InstallationDetails from "../pages/InstallationsDetails"
import Assets from "../pages/Assets.tsx"
import Forms from "../pages/Forms.tsx"
import Manuals from "../pages/Manuals.tsx"
import Subscriptions from "../pages/Subscriptions.tsx"
import WorkOrders from "../pages/WorkOrders.tsx"
import Calendar from "../pages/Calendar.tsx"
import DeviceFormPage from "../pages/DeviceFormPage"
import PublicDeviceViewPage from "../pages/PublicDeviceViewPage"
import FormularioRedirect from "../pages/FormularioRedirect"
import MainLayout from "../layouts/MainLayout"
import ProtectedRoute from "./ProtectedRoute"
import RoleProtectedRoute from "./RoleProtectedRoute"
import RedirectIfLogged from "../../src/router/RedirectIfLoggedIn.tsx"
import Home from "../pages/Home" // <-- Import del componente Home
import Profile from '../pages/Profile';
import UserProfile from '../pages/UserProfile';
import PanelAdmin from '../pages/PanelAdmin';
import NotFound from '../pages/NotFound';
import Tenants from '../pages/Tenants';
import Clients from '../pages/Clients';
import { ROLES } from "../shared/utils/roleUtils"

export const router = createBrowserRouter([
  // Ruta pública para vista de dispositivos (QR)
  {
    path: "/dispositivo/:installationId/:deviceId",
    element: <PublicDeviceViewPage />,
  },
  // Ruta pública que redirige según autenticación (QR antiguos)
  {
    path: "/formulario/:installationId/:deviceId",
    element: <FormularioRedirect />,
  },
  {
    element: <RedirectIfLogged />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/inicio",
            element: <RoleProtectedRoute section="inicio"><Home /></RoleProtectedRoute>,
          },
          {
            path: "/instalaciones",
            element: <RoleProtectedRoute section="instalaciones"><Installations /></RoleProtectedRoute>,
          },
          {
            path: "/instalaciones/:id",
            element: <RoleProtectedRoute section="instalaciones"><InstallationDetails /></RoleProtectedRoute>,
          },
          {
            path: "/perfil",
            element: <RoleProtectedRoute section="perfil"><Profile /></RoleProtectedRoute>,
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />, // Solo super_admin para panel admin
            children: [
              { path: "/panel-admin", element: <PanelAdmin /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />, // Solo super_admin para tenants
            children: [
              { path: "/tenants", element: <Tenants /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />, // Solo admin, no super_admin ni tecnico
            children: [
              { path: "/activos", element: <Assets /> },
              { path: "/formularios", element: <Forms /> },
              { path: "/personal", element: <Register /> },
              { path: "/clientes", element: <Clients /> },
              { path: "/perfil/:userId", element: <UserProfile /> },
            ],
          },
          {
            path: "/manuales",
            element: <Manuals />,
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />, // Solo admin para abonos
            children: [
              { path: "/abonos-vigentes", element: <Subscriptions /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.TECHNICIAN_ALT]} />, // Admin y tecnico para ordenes
            children: [
              { path: "/ordenes-trabajo", element: <WorkOrders /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.TECHNICIAN_ALT]} />, // Admin y tecnico para calendario
            children: [
              { path: "/calendario", element: <Calendar /> },
            ],
          },
          {
            path: "/formulario-interno/:installationId/:deviceId",
            element: <DeviceFormPage />,
          },
          {
            path: "*",
            element: <NotFound />,
          },
        ],
      },
    ],
  },
])


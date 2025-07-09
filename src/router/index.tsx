import { createBrowserRouter } from "react-router-dom"
import Login from "../pages/Login"
import Register from "../pages/Register"
import Installations from "../pages/Installations"
import InstallationDetails from "../pages/InstallationsDetails"
import Assets from "../pages/Assets.tsx"
import Forms from "../pages/Forms.tsx"
import Manuals from "../pages/Manuals.tsx"
import WorkOrders from "../pages/WorkOrders.tsx"
import Calendar from "../pages/Calendar.tsx"
import DeviceFormPage from "../pages/DeviceFormPage"
import MainLayout from "../layouts/MainLayout"
import ProtectedRoute from "./ProtectedRoute"
import RedirectIfLogged from "../../src/router/RedirectIfLoggedIn.tsx"
import Home from "../pages/Home" // <-- Import del componente Home

export const router = createBrowserRouter([
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
            path: "/inicio", // <-- Ruta agregada
            element: <Home />,
          },
          {
            path: "/instalaciones",
            element: <Installations />,
          },
          {
            path: "/instalaciones/:id",
            element: <InstallationDetails />,
          },
          {
            path: "/activos",
            element: <Assets />,
          },
          {
            path: "/formularios",
            element: <Forms />,
          },
          {
            path: "/manuales",
            element: <Manuals />,
          },
          {
            path: "/ordenes-trabajo",
            element: <WorkOrders />,
          },
          {
            path: "/calendario",
            element: <Calendar />,
          },
          {
            path: "/personal",
            element: <Register />,
          },
          {
            path: "/formulario/:installationId/:deviceId",
            element: <DeviceFormPage />,
          },
        ],
      },
    ],
  },
])

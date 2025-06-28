import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Installations from "../pages/Installations";
import InstallationDetails from "../pages/InstallationsDetails";
import Assets from "../pages/Assets.tsx";
import Forms from "../pages/Forms.tsx";
import Manuals from "../pages/Manuals.tsx";
import WorkOrders from "../pages/WorkOrders.tsx";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import RedirectIfLogged from "../../src/router/RedirectIfLoggedIn.tsx";

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
            path: "/register",
            element: <Register />,
          },
        ],
      },
    ],
  },
]);
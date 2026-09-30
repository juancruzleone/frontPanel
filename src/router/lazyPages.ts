import { lazy } from "react";

export const Login = lazy(() => import("../pages/Login"));
export const Register = lazy(() => import("../pages/Register"));
export const Installations = lazy(() => import("../pages/Installations"));
export const InstallationDetails = lazy(() => import("../pages/InstallationsDetails"));
export const Assets = lazy(() => import("../pages/Assets.tsx"));
export const Inventory = lazy(() => import("../pages/Inventory.tsx"));
export const Forms = lazy(() => import("../pages/Forms.tsx"));
export const Manuals = lazy(() => import("../pages/Manuals.tsx"));
export const Suppliers = lazy(() => import("../pages/Suppliers.tsx"));
export const Subscriptions = lazy(() => import("../pages/Subscriptions.tsx"));
export const WorkOrders = lazy(() => import("../pages/WorkOrders.tsx"));
export const Calendar = lazy(() => import("../pages/Calendar.tsx"));
export const DeviceFormPage = lazy(() => import("../pages/DeviceFormPage"));
export const PublicDeviceViewPage = lazy(() => import("../pages/PublicDeviceViewPage"));
export const FormularioRedirect = lazy(() => import("../pages/FormularioRedirect"));
export const MainLayout = lazy(() => import("../layouts/MainLayout"));
export const Home = lazy(() => import("../pages/Home"));
export const Profile = lazy(() => import("../pages/Profile"));
export const UserProfile = lazy(() => import("../pages/UserProfile"));
export const PanelAdmin = lazy(() => import("../pages/PanelAdmin"));
export const NotFound = lazy(() => import("../pages/NotFound"));
export const Tenants = lazy(() => import("../pages/Tenants"));
export const Clients = lazy(() => import("../pages/Clients"));
export const Settings = lazy(() => import("../pages/Settings"));
export const AuditLogs = lazy(() => import("../pages/AuditLogs"));
export const Compliance = lazy(() => import("../pages/Compliance"));
export const BillingAccessPage = lazy(() =>
  import("../features/billing/pages/BillingAccessPage").then((module) => ({ default: module.BillingAccessPage })),
);
export const BillingReturnPage = lazy(() =>
  import("../features/billing/pages/BillingReturnPage").then((module) => ({ default: module.BillingReturnPage })),
);

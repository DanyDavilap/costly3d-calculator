import { lazy } from "react";
import {
  createBrowserRouter,
  Outlet,
} from "react-router-dom";
import App from "../App";
import AppError from "../components/layout/AppError";

const LoginPage = lazy(() => import("../pages/Login/Login"));
const DashboardPage = lazy(() => import("../pages/Dashboard/Dashboard"));
const ItemsPage = lazy(() => import("../pages/Items/Items"));
const FaltantesPage = lazy(() => import("../pages/Faltantes/Faltantes"));
const ReportesPage = lazy(() => import("../pages/Reportes/Reportes"));
const ConfigPage = lazy(() => import("../pages/Configuracion/Configuracion"));
const WikiPage = lazy(() => import("../pages/Wiki/Wiki"));

function ProtectedRoute() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <AppError />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "items", element: <ItemsPage /> },
          { path: "faltantes", element: <FaltantesPage /> },
          { path: "reportes", element: <ReportesPage /> },
          { path: "configuracion", element: <ConfigPage /> },
          { path: "wiki", element: <WikiPage /> },
        ],
      },
      { path: "login", element: <LoginPage /> },
    ],
  },
]);

export default router;

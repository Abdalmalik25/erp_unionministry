import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { RootLayout } from "./components/layouts/RootLayoutNew";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardSkeleton, TableSkeleton } from "./components/ui/LoadingSkeleton";

// Eager Loading للصفحات الأساسية
import { Login } from "./pages/Login";
import { CreateDemoUsers } from "./pages/CreateDemoUsers";

// Lazy Loading لباقي الصفحات
const MinistryDashboard = lazy(() => import("./pages/ministry/DashboardNew").then(m => ({ default: m.MinistryDashboard })));
const EnterpriseDashboard = lazy(() => import("./pages/ministry/EnterpriseDashboard"));
const OrganizationDashboard = lazy(() => import("./pages/organization/Dashboard").then(m => ({ default: m.OrganizationDashboard })));
const UnionsManagement = lazy(() => import("./pages/ministry/UnionsManagementNew").then(m => ({ default: m.UnionsManagement })));
const MembersManagement = lazy(() => import("./pages/ministry/MembersManagementNew").then(m => ({ default: m.MembersManagement })));
const ElectionsManagement = lazy(() => import("./pages/ministry/ElectionsManagement").then(m => ({ default: m.ElectionsManagement })));
const ActivitiesManagement = lazy(() => import("./pages/ministry/ActivitiesManagement").then(m => ({ default: m.ActivitiesManagement })));
const DocumentsManagement = lazy(() => import("./pages/ministry/DocumentsManagement").then(m => ({ default: m.DocumentsManagement })));
const ServicesManagement = lazy(() => import("./pages/ministry/ServicesManagement").then(m => ({ default: m.ServicesManagement })));
const ViolationsManagement = lazy(() => import("./pages/ministry/ViolationsManagement").then(m => ({ default: m.ViolationsManagement })));
const ReportsManagement = lazy(() => import("./pages/ministry/ReportsManagement").then(m => ({ default: m.ReportsManagement })));
const AuditLog = lazy(() => import("./pages/ministry/AuditLog").then(m => ({ default: m.AuditLog })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));

// Loading Wrapper
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>;
}

// Ministry Routes Wrapper
function MinistryRoutes() {
  return (
    <ProtectedRoute requireMinistry>
      <RootLayout />
    </ProtectedRoute>
  );
}

// Organization Routes Wrapper
function OrganizationRoutes() {
  return (
    <ProtectedRoute requireOrganization>
      <RootLayout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/ministry",
    Component: MinistryRoutes,
    children: [
      {
        index: true,
        element: <LazyPage><MinistryDashboard /></LazyPage>
      },
      {
        path: "enterprise",
        element: <LazyPage><EnterpriseDashboard /></LazyPage>
      },
      {
        path: "unions",
        element: <LazyPage><UnionsManagement /></LazyPage>
      },
      {
        path: "members",
        element: <LazyPage><MembersManagement /></LazyPage>
      },
      {
        path: "elections",
        element: <LazyPage><ElectionsManagement /></LazyPage>
      },
      {
        path: "activities",
        element: <LazyPage><ActivitiesManagement /></LazyPage>
      },
      {
        path: "documents",
        element: <LazyPage><DocumentsManagement /></LazyPage>
      },
      {
        path: "services",
        element: <LazyPage><ServicesManagement /></LazyPage>
      },
      {
        path: "violations",
        element: <LazyPage><ViolationsManagement /></LazyPage>
      },
      {
        path: "reports",
        element: <LazyPage><ReportsManagement /></LazyPage>
      },
      {
        path: "audit",
        element: <LazyPage><AuditLog /></LazyPage>
      },
      {
        path: "profile",
        element: <LazyPage><Profile /></LazyPage>
      },
    ],
  },
  {
    path: "/organization",
    Component: OrganizationRoutes,
    children: [
      {
        index: true,
        element: <LazyPage><OrganizationDashboard /></LazyPage>
      },
      {
        path: "members",
        element: <LazyPage><MembersManagement /></LazyPage>
      },
      {
        path: "activities",
        element: <LazyPage><ActivitiesManagement /></LazyPage>
      },
      {
        path: "documents",
        element: <LazyPage><DocumentsManagement /></LazyPage>
      },
      {
        path: "services",
        element: <LazyPage><ServicesManagement /></LazyPage>
      },
      {
        path: "profile",
        element: <LazyPage><Profile /></LazyPage>
      },
    ],
  },
  {
    path: "/create-demo-users",
    Component: CreateDemoUsers,
  },
  {
    path: "*",
    element: <LazyPage><NotFound /></LazyPage>,
  },
]);

import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { RootLayout } from "./components/layouts/RootLayoutNew";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardSkeleton } from "./components/ui/LoadingSkeleton";

// Eager Loading للصفحات الأساسية
import { Login } from "./pages/Login";
import { CreateDemoUsers } from "./pages/CreateDemoUsers";

// Lazy Loading لباقي الصفحات
const MinistryDashboard = lazy(() => import("./pages/ministry/DashboardNewEnhanced").then(m => ({ default: m.DashboardNewEnhanced })));
const CommercialEstablishmentsManagement = lazy(() => import("./pages/ministry/CommercialEstablishmentsManagement").then(m => ({ default: m.CommercialEstablishmentsManagement })));
const OrganizationDashboard = lazy(() => import("./pages/organization/Dashboard").then(m => ({ default: m.OrganizationDashboard })));
const UnionsManagement = lazy(() => import("./pages/ministry/UnionsManagementNew").then(m => ({ default: m.UnionsManagementNew })));
const MembersManagement = lazy(() => import("./pages/ministry/MembersManagementNew").then(m => ({ default: m.MembersManagement })));
const ElectionsManagement = lazy(() => import("./pages/ministry/ElectionsManagement"));
const ActivitiesManagement = lazy(() => import("./pages/ministry/ActivitiesManagement"));
const DocumentsManagement = lazy(() => import("./pages/ministry/DocumentsManagement").then(m => ({ default: m.DocumentsManagement })));
const ServicesManagement = lazy(() => import("./pages/ministry/ServicesManagement").then(m => ({ default: m.ServicesManagement })));
const ViolationsManagement = lazy(() => import("./pages/ministry/ViolationsManagement"));
const ReportsManagement = lazy(() => import("./pages/ministry/ReportsManagement").then(m => ({ default: m.ReportsManagement })));
const AuditLog = lazy(() => import("./pages/ministry/AuditLog").then(m => ({ default: m.AuditLog })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const DispatchesManagement = lazy(() => import("./pages/ministry/DispatchesManagement"));
const ReductionRequestsManagement = lazy(() => import("./pages/ministry/ReductionRequestsManagement"));
const ISIC4Management = lazy(() => import("./pages/ministry/ISIC4Management"));
const ComplianceAlertsManagement = lazy(() => import("./pages/ministry/ComplianceAlertsManagement"));
const FeePaymentsManagement = lazy(() => import("./pages/ministry/FeePaymentsManagement"));
const WorkerProfilesManagement = lazy(() => import("./pages/ministry/WorkerProfilesManagement"));
const ProfessionsManagement = lazy(() => import("./pages/ministry/ProfessionsManagement"));
const InspectionsManagement = lazy(() => import("./pages/ministry/InspectionsManagement"));
const EvaluationCertificatesManagement = lazy(() => import("./pages/ministry/EvaluationCertificatesManagement"));
const LicensesManagement = lazy(() => import("./pages/ministry/LicensesManagement"));
const TrainingRecordsManagement = lazy(() => import("./pages/ministry/TrainingRecordsManagement"));
const BoardMembersManagement = lazy(() => import("./pages/ministry/BoardMembersManagement"));
const SectorUsersManagement = lazy(() => import("./pages/ministry/SectorUsersManagement").then(m => ({ default: m.SectorUsersManagement })));
const NotificationsManagement = lazy(() => import("./pages/ministry/NotificationsManagement"));
const LaborDisputesManagement = lazy(() => import("./pages/ministry/LaborDisputesManagement"));
const ExpatriateLicensesManagement = lazy(() => import("./pages/ministry/ExpatriateLicensesManagement"));
const LegalReferencesManagement = lazy(() => import("./pages/ministry/LegalReferencesManagement").then(m => ({ default: m.LegalReferencesManagement })));
const RiskAssessmentsManagement = lazy(() => import("./pages/ministry/RiskAssessmentsManagement").then(m => ({ default: m.RiskAssessmentsManagement })));
const ComplianceMatricesManagement = lazy(() => import("./pages/ministry/ComplianceMatricesManagement").then(m => ({ default: m.ComplianceMatricesManagement })));
const MaturityAssessmentsManagement = lazy(() => import("./pages/ministry/MaturityAssessmentsManagement").then(m => ({ default: m.MaturityAssessmentsManagement })));
const OccupationLinksManagement = lazy(() => import("./pages/ministry/OccupationLinksManagement").then(m => ({ default: m.OccupationLinksManagement })));
const EntityRelationshipsManagement = lazy(() => import("./pages/ministry/EntityRelationshipsManagement").then(m => ({ default: m.EntityRelationshipsManagement })));
const EntityDetailPage = lazy(() => import("./pages/ministry/EntityDetailPage"));
const ComparativeAnalysis = lazy(() => import("./pages/ministry/ComparativeAnalysis"));
const LaborRecordsPage = lazy(() => import("./pages/ministry/LaborRecordsPage").then(m => ({ default: m.default })));
const RolesGallery = lazy(() => import("./components/national/RolesGallery").then(m => ({ default: m.default })));

// Organization-specific pages
const OrgMembersManagement = lazy(() => import("./pages/organization/MembersManagement").then(m => ({ default: m.OrganizationMembersManagement })));
const OrgActivitiesManagement = lazy(() => import("./pages/organization/ActivitiesManagement").then(m => ({ default: m.OrganizationActivitiesManagement })));
const OrgDocumentsManagement = lazy(() => import("./pages/organization/DocumentsManagement").then(m => ({ default: m.OrganizationDocumentsManagement })));
const OrgServicesManagement = lazy(() => import("./pages/organization/ServicesManagement").then(m => ({ default: m.OrganizationServicesManagement })));

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
        element: <LazyPage><CommercialEstablishmentsManagement /></LazyPage>
      },
      {
        path: "commercial",
        element: <LazyPage><CommercialEstablishmentsManagement /></LazyPage>
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
        path: "users",
        element: <LazyPage><SectorUsersManagement /></LazyPage>
      },
      {
        path: "dispatches",
        element: <LazyPage><DispatchesManagement /></LazyPage>
      },
      {
        path: "reduction-requests",
        element: <LazyPage><ReductionRequestsManagement /></LazyPage>
      },
      {
        path: "isic4",
        element: <LazyPage><ISIC4Management /></LazyPage>
      },
      {
        path: "compliance-alerts",
        element: <LazyPage><ComplianceAlertsManagement /></LazyPage>
      },
      {
        path: "fee-payments",
        element: <LazyPage><FeePaymentsManagement /></LazyPage>
      },
      {
        path: "worker-profiles",
        element: <LazyPage><WorkerProfilesManagement /></LazyPage>
      },
      {
        path: "professions",
        element: <LazyPage><ProfessionsManagement /></LazyPage>
      },
      {
        path: "inspections",
        element: <LazyPage><InspectionsManagement /></LazyPage>
      },
      {
        path: "evaluation-certificates",
        element: <LazyPage><EvaluationCertificatesManagement /></LazyPage>
      },
      {
        path: "licenses",
        element: <LazyPage><LicensesManagement /></LazyPage>
      },
      {
        path: "training-records",
        element: <LazyPage><TrainingRecordsManagement /></LazyPage>
      },
      {
        path: "board-members",
        element: <LazyPage><BoardMembersManagement /></LazyPage>
      },
      {
        path: "notifications",
        element: <LazyPage><NotificationsManagement /></LazyPage>
      },
      {
        path: "labor-disputes",
        element: <LazyPage><LaborDisputesManagement /></LazyPage>
      },
      {
        path: "expatriate-licenses",
        element: <LazyPage><ExpatriateLicensesManagement /></LazyPage>
      },
      {
        path: "legal-references",
        element: <LazyPage><LegalReferencesManagement /></LazyPage>
      },
      {
        path: "risk-assessments",
        element: <LazyPage><RiskAssessmentsManagement /></LazyPage>
      },
      {
        path: "compliance-matrices",
        element: <LazyPage><ComplianceMatricesManagement /></LazyPage>
      },
      {
        path: "maturity-assessments",
        element: <LazyPage><MaturityAssessmentsManagement /></LazyPage>
      },
      {
        path: "occupation-links",
        element: <LazyPage><OccupationLinksManagement /></LazyPage>
      },
      {
        path: "entity-relationships",
        element: <LazyPage><EntityRelationshipsManagement /></LazyPage>
      },
      {
        path: "entities/:id",
        element: <LazyPage><EntityDetailPage /></LazyPage>
      },
      {
        path: "comparative",
        element: <LazyPage><ComparativeAnalysis /></LazyPage>
      },
      {
        path: "labor-records/:resource",
        element: <LazyPage><LaborRecordsPage /></LazyPage>
      },
      {
        path: "roles",
        element: <LazyPage><RolesGallery /></LazyPage>
      },
      {
        path: "roles/:roleKey",
        element: <LazyPage><RolesGallery /></LazyPage>
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
        element: <LazyPage><OrgMembersManagement /></LazyPage>
      },
      {
        path: "activities",
        element: <LazyPage><OrgActivitiesManagement /></LazyPage>
      },
      {
        path: "documents",
        element: <LazyPage><OrgDocumentsManagement /></LazyPage>
      },
      {
        path: "services",
        element: <LazyPage><OrgServicesManagement /></LazyPage>
      },
      {
        path: "profile",
        element: <LazyPage><Profile /></LazyPage>
      },
    ],
  },
  // مسار تطويري فقط: يُفعَّل حين VITE_ENABLE_DEMO_MODE=true
  ...(import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'
    ? [{ path: '/create-demo-users', Component: CreateDemoUsers }]
    : []),
  {
    path: "*",
    element: <LazyPage><NotFound /></LazyPage>,
  },
]);
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../auth/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { UsersPage } from "../pages/admin/UsersPage";
import { AuditLogsPage } from "../pages/admin/AuditLogsPage";
import { AdminRoute, ProtectedRoute } from "./ProtectedRoute";

import { DashboardPage } from "../pages/DashboardPage";
import { DepartmentsPage } from "../pages/DepartmentsPage";
import { EmployeesPage } from "../pages/EmployeesPage";
import { ScientificMembersPage } from "../pages/ScientificMembersPage";
import { SchoolsPage } from "../pages/SchoolsPage";
import { ObservationsPage } from "../pages/ObservationsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/scientific-members" element={<ScientificMembersPage />} />
          <Route path="/observations" element={<ObservationsPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

function ProtectedShell() {
  const { user } = useAuth();
  return <AppShell key={user?.id}><Outlet /></AppShell>;
}

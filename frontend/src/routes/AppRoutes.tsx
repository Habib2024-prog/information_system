import { Route, Routes } from "react-router-dom";

import { DashboardPage } from "../pages/DashboardPage";
import { DepartmentsPage } from "../pages/DepartmentsPage";
import { EmployeesPage } from "../pages/EmployeesPage";
import { ScientificMembersPage } from "../pages/ScientificMembersPage";
import { ObservationsPage, SchoolsPage } from "../pages/ModulePages";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="/departments" element={<DepartmentsPage />} />
      <Route path="/scientific-members" element={<ScientificMembersPage />} />
      <Route path="/observations" element={<ObservationsPage />} />
      <Route path="/schools" element={<SchoolsPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
}

import { apiGet, apiDownload } from "./client";
import type { EmployeeFilters } from "./employees";
import type { Department } from "../types/api";

export const getDepartments = () => apiGet<Department[]>("/api/departments");

function toQuery(filters: Partial<EmployeeFilters>): string {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function exportDepartmentEmployees(departmentId: number, filters: Partial<EmployeeFilters>): Promise<string> {
  return apiDownload(`/api/departments/${departmentId}/employees/export${toQuery(filters)}`, "department_employees.xlsx");
}

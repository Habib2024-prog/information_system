import { apiGet, getApiUrl } from "./client";
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
  const response = await fetch(getApiUrl(`/api/departments/${departmentId}/employees/export${toQuery(filters)}`));
  if (!response.ok) throw new Error("صدور فایل اکسل با مشکل روبه‌رو شد.");

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "department_employees.xlsx";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

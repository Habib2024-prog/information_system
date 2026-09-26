import { apiGet, apiRequest, getApiUrl } from "./client";
import type { Employee, PaginatedResponse } from "../types/api";

export type EmployeeSortField = "id" | "name" | "father_name" | "school_workplace" | "city_district" | "field_of_study" | "education_level" | "job_title_code" | "grade_post" | "step" | "successful_evaluation" | "field_match_code";

export interface EmployeeFilters {
  search: string;
  name?: string;
  father_name?: string;
  job_title_code: string;
  field_match_code: string;
  department_id: string;
  education_level: string;
  school_workplace: string;
  city_district: string;
}

export interface EmployeeListParams extends Partial<EmployeeFilters> {
  page: number;
  page_size: number;
  sort_by: EmployeeSortField;
  sort_order: "asc" | "desc";
}

export interface EmployeePayload {
  name: string;
  father_name: string;
  grandfather_name: string;
  school_workplace: string;
  city_district: string;
  phone_number: string;
  field_of_study: string;
  education_level: string;
  subjects_taught: string;
  job_title_code: string;
  teaching_experience: number;
  grade_post: number;
  step: number;
  successful_evaluation: string;
  field_match_code: string;
  department_ids: number[];
  notes: string | null;
}

export const emptyEmployeeFilters: EmployeeFilters = {
  search: "",
  job_title_code: "",
  field_match_code: "",
  department_id: "",
  education_level: "",
  school_workplace: "",
  city_district: "",
};

function toQuery(params: Partial<EmployeeListParams>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const getEmployees = (params: EmployeeListParams = { ...emptyEmployeeFilters, page: 1, page_size: 20, sort_by: "id", sort_order: "asc" }) =>
  apiGet<PaginatedResponse<Employee>>(`/api/employees${toQuery(params)}`);
export const getEmployee = (id: number) => apiGet<Employee>(`/api/employees/${id}`);

export const createEmployee = (payload: EmployeePayload) => apiRequest<Employee>("/api/employees", { method: "POST", body: JSON.stringify(payload) });
export const updateEmployee = (id: number, payload: EmployeePayload) => apiRequest<Employee>(`/api/employees/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export async function deleteEmployee(id: number): Promise<void> {
  const response = await fetch(getApiUrl(`/api/employees/${id}`), { method: "DELETE" });
  if (!response.ok) throw new Error("حذف کارمند با مشکل روبه‌رو شد.");
}

export async function exportEmployees(filters: Partial<EmployeeFilters>): Promise<string> {
  const response = await fetch(getApiUrl(`/api/employees/export${toQuery(filters)}`));
  if (!response.ok) throw new Error("صدور فایل اکسل با مشکل روبه‌رو شد.");
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "employees.xlsx";
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

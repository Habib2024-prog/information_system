import { DEFAULT_PAGE_SIZE } from "../lib/pagination";
import { apiGet, apiRequest, apiFetch, apiDownload } from "./client";
import type { PaginatedResponse, School } from "../types/api";

export type SchoolSortField =
  | "id"
  | "school_name"
  | "school_code"
  | "school_type_code"
  | "gender_type_code"
  | "school_formation";

export interface SchoolFilters {
  search: string;
  school_type_code: string;
  gender_type_code: string;
  school_code: string;
  school_formation: string;
}

export interface SchoolGradeSectionPayload {
  id?: number;
  section_name: string;
  enrolled_count: number;
  present_count: number;
  female_count: number;
  male_count: number;
}

export interface SchoolGradeStatisticPayload {
  grade_number: number;
  sections: SchoolGradeSectionPayload[];
}

export interface SchoolPayload {
  school_name: string;
  school_head_phone: string | null;
  school_type_code: string;
  gender_type_code: string;
  school_code: string;
  school_formation: string;
  senior_teacher_count: number;
  male_teacher_count: number;
  female_teacher_count: number;
  incoming_service_teacher_count: number;
  outgoing_service_teacher_count: number;
  volunteer_teacher_count: number;
  active_class_section_count: number;
  school_needs: string | null;
  school_equipment: string | null;
  grade_statistics: SchoolGradeStatisticPayload[];
}

export interface SchoolListParams extends Partial<SchoolFilters> {
  page: number;
  page_size: number;
  sort_by: SchoolSortField;
  sort_order: "asc" | "desc";
}

export const emptySchoolFilters: SchoolFilters = {
  search: "",
  school_type_code: "",
  gender_type_code: "",
  school_code: "",
  school_formation: "",
};

function toQuery(params: Partial<SchoolListParams>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function getSchools(params: SchoolListParams = { ...emptySchoolFilters, page: 1, page_size: DEFAULT_PAGE_SIZE, sort_by: "id", sort_order: "asc" }) {
  return apiGet<PaginatedResponse<School>>(`/api/schools${toQuery(params)}`);
}

export const getSchool = (schoolId: number) => apiGet<School>(`/api/schools/${schoolId}`);
export const createSchool = (payload: SchoolPayload) => apiRequest<School>("/api/schools", { method: "POST", body: JSON.stringify(payload) });
export const updateSchool = (schoolId: number, payload: SchoolPayload) => apiRequest<School>(`/api/schools/${schoolId}`, { method: "PUT", body: JSON.stringify(payload) });

export async function deleteSchool(schoolId: number): Promise<void> {
  const response = await apiFetch(`/api/schools/${schoolId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("حذف مکتب با مشکل روبه‌رو شد.");
}

export async function exportSchools(filters: Partial<SchoolFilters>): Promise<string> {
  return apiDownload(`/api/schools/export${toQuery(filters)}`, "schools.xlsx");
}

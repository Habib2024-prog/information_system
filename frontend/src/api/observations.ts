import { apiGet, apiRequest, getApiUrl } from "./client";
import type { PaginatedResponse } from "../types/api";

export const observationCountUnavailable = true;

interface ObservationBasePayload {
  observer_scientific_member_id: number;
  observation_date: string;
  observed_class: string;
  subject: string;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
}

export interface TeacherObservationPayload extends ObservationBasePayload {
  subject_knowledge_score: number;
  lesson_plan_score: number;
  classroom_management_score: number;
  assessment_score: number;
  professional_learning_score: number;
  community_engagement_score: number;
}

export interface AmirObservationPayload extends ObservationBasePayload {
  responsibility_score: number;
  professional_leadership_score: number;
  community_relations_score: number;
  professional_development_score: number;
}

interface ObservationObserver { id: number; name: string; surname: string; father_name: string; }
export interface TeacherObservationDetail { id: number; employee_id: number; observation_date: string; observed_class: string; subject: string; observer: ObservationObserver; total_score: number; final_result_code: string | null; subject_knowledge_score: number; lesson_plan_score: number; classroom_management_score: number; assessment_score: number; professional_learning_score: number; community_engagement_score: number; strengths: string | null; improvements: string | null; notes: string | null; }
export interface AmirObservationDetail { id: number; employee_id: number; observation_date: string; observed_class: string; subject: string; observer: ObservationObserver; total_score: number; final_result_code: string | null; responsibility_score: number; professional_leadership_score: number; community_relations_score: number; professional_development_score: number; strengths: string | null; improvements: string | null; notes: string | null; }

export interface ObservationListItem {
  id: number;
  observation_date: string;
  subject: string;
  observer: ObservationObserver;
  total_score: number;
  final_result_code: string | null;
  employee_id: number;
  employee_name: string;
  employee_father_name: string;
  employee_school_workplace: string;
  employee_job_title_code: string;
}

export interface ObservationFilters {
  search: string;
  employee_id: string;
  observer_scientific_member_id: string;
  observation_date_from: string;
  observation_date_to: string;
  subject: string;
  final_result_code: string;
  employee_job_title_code: string;
}

export const emptyObservationFilters: ObservationFilters = {
  search: "", employee_id: "", observer_scientific_member_id: "", observation_date_from: "", observation_date_to: "", subject: "", final_result_code: "", employee_job_title_code: "",
};

function toQuery(params: Partial<ObservationFilters & { page: number; page_size: number }>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function createTeacherObservation(employeeId: number, payload: TeacherObservationPayload) {
  return apiRequest(`/api/employees/${employeeId}/teacher-observations`, { method: "POST", body: JSON.stringify(payload) });
}

export function createAmirObservation(employeeId: number, payload: AmirObservationPayload) {
  return apiRequest(`/api/employees/${employeeId}/amir-observations`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateTeacherObservation(employeeId: number, observationId: number, payload: TeacherObservationPayload) {
  return apiRequest<TeacherObservationDetail>(`/api/employees/${employeeId}/teacher-observations/${observationId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function updateAmirObservation(employeeId: number, observationId: number, payload: AmirObservationPayload) {
  return apiRequest<AmirObservationDetail>(`/api/employees/${employeeId}/amir-observations/${observationId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export const getTeacherObservation = (employeeId: number, observationId: number) => apiGet<TeacherObservationDetail>(`/api/employees/${employeeId}/teacher-observations/${observationId}`);
export const getAmirObservation = (employeeId: number, observationId: number) => apiGet<AmirObservationDetail>(`/api/employees/${employeeId}/amir-observations/${observationId}`);

export const getTeacherObservations = (params: Partial<ObservationFilters & { page: number; page_size: number }>) =>
  apiGet<PaginatedResponse<ObservationListItem>>(`/api/teacher-observations${toQuery(params)}`);
export const getAmirObservations = (params: Partial<ObservationFilters & { page: number; page_size: number }>) =>
  apiGet<PaginatedResponse<ObservationListItem>>(`/api/amir-observations${toQuery(params)}`);

export async function deleteTeacherObservation(employeeId: number, observationId: number): Promise<void> {
  const response = await fetch(getApiUrl(`/api/employees/${employeeId}/teacher-observations/${observationId}`), { method: "DELETE" });
  if (!response.ok) throw new Error("حذف مشاهده با مشکل روبه‌رو شد.");
}

export async function deleteAmirObservation(employeeId: number, observationId: number): Promise<void> {
  const response = await fetch(getApiUrl(`/api/employees/${employeeId}/amir-observations/${observationId}`), { method: "DELETE" });
  if (!response.ok) throw new Error("حذف مشاهده با مشکل روبه‌رو شد.");
}

async function exportObservations(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(getApiUrl(path));
  if (!response.ok) throw new Error("دریافت فایل اکسل با مشکل روبه‌رو شد.");
  const filename = response.headers.get("content-disposition")?.match(/filename=\"?([^\";]+)\"?/i)?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export const exportTeacherObservations = (filters: Partial<ObservationFilters>) => exportObservations(`/api/teacher-observations/export${toQuery(filters)}`, "teacher_observations.xlsx");
export const exportAmirObservations = (filters: Partial<ObservationFilters>) => exportObservations(`/api/amir-observations/export${toQuery(filters)}`, "amir_observations.xlsx");

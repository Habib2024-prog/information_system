import { apiGet, apiRequest, getApiUrl } from "./client";
import type { PaginatedResponse, ScientificMember } from "../types/api";

export interface ScientificMemberFilters { search: string; name: string; surname: string; father_name: string; academic_rank: string; department_id: string; }
export interface ScientificMemberListParams extends Partial<ScientificMemberFilters> { page?: number; page_size?: number; sort_by?: "id" | "name" | "surname" | "father_name" | "phone_number" | "academic_rank" | "department_id"; sort_order?: "asc" | "desc"; }
export interface ScientificMemberPayload { name: string; surname: string; father_name: string; phone_number: string; academic_rank: string; department_id: number; notes: string | null; }
export interface ObservationHistoryFilters { observation_type: string; date_from: string; date_to: string; employee_id: string; final_result_code: string; }
export interface ObservationHistoryItem { observation_id: number; observation_type: "teacher" | "amir_senior_teacher"; observed_employee_id: number; observed_employee_name: string; observed_employee_father_name: string; observed_employee_job_title_code: string; observation_date: string; subject: string; total_score: number; final_result_code: string | null; }

export const emptyScientificMemberFilters: ScientificMemberFilters = { search: "", name: "", surname: "", father_name: "", academic_rank: "", department_id: "" };
export const emptyObservationHistoryFilters: ObservationHistoryFilters = { observation_type: "", date_from: "", date_to: "", employee_id: "", final_result_code: "" };

function toQuery(params: Record<string, string | number | undefined>): string { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== "" && value !== undefined) query.set(key, String(value)); }); const serialized = query.toString(); return serialized ? `?${serialized}` : ""; }

export function getScientificMembers({ page = 1, page_size = 100, search = "", ...filters }: ScientificMemberListParams = {}) { return apiGet<PaginatedResponse<ScientificMember>>(`/api/scientific-members${toQuery({ page, page_size, search, ...filters })}`); }
export const createScientificMember = (payload: ScientificMemberPayload) => apiRequest<ScientificMember>("/api/scientific-members", { method: "POST", body: JSON.stringify(payload) });
export const updateScientificMember = (id: number, payload: ScientificMemberPayload) => apiRequest<ScientificMember>(`/api/scientific-members/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export async function deleteScientificMember(id: number) { const response = await fetch(getApiUrl(`/api/scientific-members/${id}`), { method: "DELETE" }); if (!response.ok) throw new Error("حذف عضو علمی با مشکل روبه‌رو شد."); }
export async function exportScientificMembers(filters: Partial<ScientificMemberFilters>) { const response = await fetch(getApiUrl(`/api/scientific-members/export${toQuery(filters)}`)); if (!response.ok) throw new Error("صدور فایل اکسل با مشکل روبه‌رو شد."); saveBlob(await response.blob(), getFilename(response, "scientific_members.xlsx")); }
export function getObservationHistory(memberId: number, { page = 1, page_size = 20, ...filters }: Partial<ObservationHistoryFilters> & { page?: number; page_size?: number } = {}) { return apiGet<PaginatedResponse<ObservationHistoryItem>>(`/api/scientific-members/${memberId}/observations${toQuery({ page, page_size, ...filters })}`); }
export async function exportObservationHistory(memberId: number) { const response = await fetch(getApiUrl(`/api/scientific-members/${memberId}/observations/export`)); if (!response.ok) throw new Error("صدور فایل اکسل مشاهدات با مشکل روبه‌رو شد."); saveBlob(await response.blob(), getFilename(response, "scientific_member_observations.xlsx")); }

function getFilename(response: Response, fallback: string) { return response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback; }
function saveBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }

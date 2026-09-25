import { apiGet, apiRequest } from "./client";

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

export function createTeacherObservation(employeeId: number, payload: TeacherObservationPayload) {
  return apiRequest(`/api/employees/${employeeId}/teacher-observations`, { method: "POST", body: JSON.stringify(payload) });
}

export function createAmirObservation(employeeId: number, payload: AmirObservationPayload) {
  return apiRequest(`/api/employees/${employeeId}/amir-observations`, { method: "POST", body: JSON.stringify(payload) });
}

export const getTeacherObservation = (employeeId: number, observationId: number) => apiGet<TeacherObservationDetail>(`/api/employees/${employeeId}/teacher-observations/${observationId}`);
export const getAmirObservation = (employeeId: number, observationId: number) => apiGet<AmirObservationDetail>(`/api/employees/${employeeId}/amir-observations/${observationId}`);

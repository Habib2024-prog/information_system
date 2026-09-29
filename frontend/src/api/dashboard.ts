import { apiGet } from "./client";
import { emptyAuditFilters, getAuditLogs } from "./auditLogs";

export interface DashboardObservationOverview {
  observation_type: "teacher" | "amir_senior_teacher";
  total: number;
  results: { final_result_code: string | null; count: number }[];
}

export interface DashboardSummary {
  totals: { employees: number; scientific_members: number; schools: number; observations: number };
  observation_overview: DashboardObservationOverview[];
}

export const getDashboardSummary = () => apiGet<DashboardSummary>("/api/dashboard/summary");

/** Existing admin-only endpoint, bounded to the latest three actual activities. */
export async function getDashboardRecentActivities() {
  const response = await getAuditLogs(emptyAuditFilters, 1, 3);
  return response.items;
}

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

const observationTypes = ["teacher", "amir_senior_teacher"] as const;

function safeCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Keeps the presentation layer safe if an aggregate is unexpectedly null while
 * preserving a real zero.  It deliberately never supplies sample data.
 */
export function normalizeDashboardSummary(summary: DashboardSummary): DashboardSummary {
  const totals = {
    employees: safeCount(summary?.totals?.employees),
    scientific_members: safeCount(summary?.totals?.scientific_members),
    schools: safeCount(summary?.totals?.schools),
    observations: safeCount(summary?.totals?.observations),
  };
  const byType = new Map(summary?.observation_overview?.map((item) => [item.observation_type, item]) ?? []);
  const observation_overview = observationTypes.map((observation_type) => {
    const item = byType.get(observation_type);
    // The aggregate total is authoritative: a zero total must never retain a
    // stale breakdown or chart segment from an earlier response.
    const total = totals.observations === 0 ? 0 : safeCount(item?.total);
    return {
      observation_type,
      total,
      results: total === 0
        ? []
        : (item?.results ?? [])
          .map((result) => ({ final_result_code: result.final_result_code ?? null, count: safeCount(result.count) }))
          .filter((result) => result.count > 0),
    };
  });

  return { totals, observation_overview };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return normalizeDashboardSummary(await apiGet<DashboardSummary>("/api/dashboard/summary"));
}

/** Existing admin-only endpoint, bounded to the latest five actual activities. */
export async function getDashboardRecentActivities() {
  const response = await getAuditLogs(emptyAuditFilters, 1, 5);
  return response.items;
}

import { apiGet } from "./client";
import type { AuditLog } from "../types/audit";
import type { PaginatedResponse } from "../types/api";

export interface AuditFilters { action: string; entity_type: string; user_id: string; entity_id: string; date_from: string; date_to: string; }
export const emptyAuditFilters: AuditFilters = { action: "", entity_type: "", user_id: "", entity_id: "", date_from: "", date_to: "" };
export function getAuditLogs(filters: AuditFilters, page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort_by: "created_at", sort_order: "desc" });
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  return apiGet<PaginatedResponse<AuditLog>>(`/api/audit-logs?${query}`);
}
export const getAuditLog = (id: number) => apiGet<AuditLog>(`/api/audit-logs/${id}`);

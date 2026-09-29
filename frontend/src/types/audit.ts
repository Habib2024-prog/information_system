import type { auditActionLabels, auditEntityLabels } from "../lib/auditLabels";
export type AuditAction = keyof typeof auditActionLabels;
export type AuditEntity = keyof typeof auditEntityLabels;
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export interface AuditLog {
  id: number;
  user: { id: number; username: string; full_name: string };
  action: AuditAction; entity_type: AuditEntity; entity_id: number | null;
  description: string; before_data: JsonObject | null; after_data: JsonObject | null;
  changes?: JsonObject | null;
  metadata: JsonObject | null; ip_address: string | null; created_at: string;
}

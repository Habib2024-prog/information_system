import { sanitizeAuditJson } from "./auditLabels";
import type { AuditLog, JsonObject, JsonValue } from "../types/audit";

export interface AuditFieldChange { field: string; old: JsonValue; new: JsonValue; }
const ignoredFields = new Set(["id", "created_at", "updated_at"]);
const identifyingFields = [
  "name", "surname", "father_name", "job_title_code", "school_name", "school_code",
  "username", "full_name", "section_name", "school_id", "grade_number", "employee_id",
  "observation_date", "subject", "department_id", "code",
];
export function isAuditObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function equalValues(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => equalValues(value, right[index]));
  if (isAuditObject(left) && isAuditObject(right)) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => key in right && equalValues(left[key], right[key]));
  }
  return false;
}
function sameFieldValue(field: string, old: JsonValue, next: JsonValue): boolean {
  if (equalValues(old, next)) return true;
  if (field.endsWith("_score") && old !== null && next !== null && ["string", "number"].includes(typeof old) && ["string", "number"].includes(typeof next)) {
    return Number.isFinite(Number(old)) && Number(old) === Number(next);
  }
  if (field === "department_ids" && Array.isArray(old) && Array.isArray(next)) {
    return equalValues([...old].sort(), [...next].sort());
  }
  return false;
}

/** New compact entries, earlier before/after deltas, and historical snapshots share one view. */
export function getAuditChanges(record: AuditLog): AuditFieldChange[] {
  const explicit = record.changes ?? record.metadata?.changes;
  if (isAuditObject(explicit)) {
    const clean = sanitizeAuditJson(explicit) as JsonObject;
    return Object.entries(clean).flatMap(([field, value]) => {
      if (ignoredFields.has(field) || !isAuditObject(value)) return [];
      const old = ("old" in value ? value.old : value.before) ?? null;
      const next = ("new" in value ? value.new : value.after) ?? null;
      return sameFieldValue(field, old, next) ? [] : [{ field, old, new: next }];
    });
  }
  const before = sanitizeAuditJson(record.before_data ?? {}) as JsonObject;
  const after = sanitizeAuditJson(record.after_data ?? {}) as JsonObject;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((field) => !ignoredFields.has(field))
    .flatMap((field) => {
      const old = before[field] ?? null, next = after[field] ?? null;
      return sameFieldValue(field, old, next) ? [] : [{ field, old, new: next }];
    });
}

export function getAuditIdentity(record: AuditLog): JsonObject {
  const compact = record.metadata?.record;
  if (isAuditObject(compact)) return sanitizeAuditJson(compact) as JsonObject;
  const snapshot = record.action.startsWith("DELETE") ? record.before_data : record.after_data;
  const clean = sanitizeAuditJson(snapshot ?? {}) as JsonObject;
  // Old CREATE/DELETE snapshots should not become a wall of unrelated database fields.
  return Object.fromEntries(identifyingFields.filter((key) => key in clean).map((key) => [key, clean[key]]));
}

export function getAuditExtraDetails(record: AuditLog): JsonObject {
  const metadata = sanitizeAuditJson(record.metadata ?? {}) as JsonObject;
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== "changes" && key !== "record"));
}

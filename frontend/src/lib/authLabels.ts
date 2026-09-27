import type { RoleCode } from "../types/auth";
export const roleLabels: Record<RoleCode, string> = { admin: "مدیر سیستم", user: "کاربر" };
export const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));
export const getRoleLabel = (code: RoleCode) => roleLabels[code] ?? "نامشخص";
export const getAccountStatusLabel = (active: boolean) => active ? "فعال" : "غیرفعال";

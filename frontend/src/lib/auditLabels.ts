import { getRoleLabel } from "./authLabels";
import { getDepartmentLabel } from "./departmentLabels";
import { getFieldMatchLabel, getJobTitleLabel } from "./employeeLabels";
import { getFinalResultLabel, getObservationTypeLabel } from "./observationLabels";
import { getGenderTypeLabel, getSchoolTypeLabel } from "./schoolLabels";
import type { JsonValue } from "../types/audit";

export const auditActionLabels = {
  LOGIN: "ورود", CREATE: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف", EXPORT: "استخراج اکسل",
  CREATE_OBSERVATION: "ثبت مشاهده", UPDATE_OBSERVATION: "ویرایش مشاهده", DELETE_OBSERVATION: "حذف مشاهده", PASSWORD_CHANGE: "تغییر رمز",
} as const;
export const auditEntityLabels = {
  employee: "کارمند", department: "دیپارتمنت", scientific_member: "عضو علمی", school: "مکتب", school_grade_section: "شعبهٔ صنف",
  teacher_observation: "مشاهده معلم", amir_observation: "مشاهده آمر / سرمعلم", user: "کاربر",
  employee_export: "اکسل کارمندان", department_export: "اکسل دیپارتمنت", scientific_member_export: "اکسل اعضای علمی",
  teacher_observation_export: "اکسل مشاهدات معلمین", amir_observation_export: "اکسل مشاهدات آمر / سرمعلم", school_export: "اکسل مکاتب",
  scientific_member_observation_export: "اکسل سوابق عضو علمی",
} as const;
export const getAuditActionLabel = (code: string) => auditActionLabels[code as keyof typeof auditActionLabels] ?? "عملیات نامشخص";
export const getAuditEntityLabel = (code: string) => auditEntityLabels[code as keyof typeof auditEntityLabels] ?? "رکورد نامشخص";
export const auditActionOptions = Object.entries(auditActionLabels).map(([value, label]) => ({ value, label }));
export const auditEntityOptions = Object.entries(auditEntityLabels).map(([value, label]) => ({ value, label }));

const fieldLabels: Record<string, string> = {
  id: "شماره", user_id: "شماره کاربر", username: "نام کاربری", full_name: "نام کامل", role_code: "نقش", is_active: "وضعیت",
  name: "اسم", surname: "تخلص", father_name: "ولد", grandfather_name: "ولدیت", phone_number: "شماره تماس",
  school_workplace: "محل وظیفه", city_district: "شهر / ولسوالی", field_of_study: "رشته تحصیلی", education_level: "درجه تحصیل",
  subjects_taught: "مضامین تدریس", job_title_code: "عنوان وظیفه", employee_job_title_code: "عنوان وظیفه", teaching_experience: "سابقه تدریس", grade_post: "بست", step: "قدم",
  successful_evaluation: "ارزیابی موفق", field_match_code: "مطابق رشته", department_id: "شماره دیپارتمنت", department_ids: "شماره دیپارتمنت‌ها", departments: "دیپارتمنت‌ها", department: "دیپارتمنت", code: "دیپارتمنت", display_name: "نام نمایشی",
  academic_rank: "رتبه علمی", notes: "ملاحظات", created_at: "تاریخ ثبت", updated_at: "تاریخ تغییر", deleted_at: "تاریخ حذف",
  action: "عملیات", entity_type: "نوع رکورد", entity_id: "شناسه رکورد", description: "توضیحات", ip_address: "نشانی شبکه",
  observation_date: "تاریخ مشاهده", observation_type: "نوع مشاهده", observed_class: "صنف مشاهده شده", subject: "مضمون", employee_id: "شماره کارمند",
  observer_scientific_member_id: "شماره مشاهده‌کننده", observer: "مشاهده‌کننده", total_score: "مجموع نمره", final_result_code: "نتیجه نهایی", strengths: "نکات قوت", improvements: "نکات قابل اصلاح",
  subject_knowledge_score: "دانش مضمونی", lesson_plan_score: "پلان درسی", classroom_management_score: "مدیریت صنف", assessment_score: "ارزیابی", professional_learning_score: "آموزش‌های مسلکی", community_engagement_score: "ارتباط با اجتماع",
  responsibility_score: "مسوولیت پذیری", professional_leadership_score: "رهبری مسلکی", community_relations_score: "روابط با جامعه", professional_development_score: "انکشاف مسلکی",
  school_id: "شماره مکتب", school_name: "نام مکتب", school_head_phone: "تماس مسئول مکتب", school_type_code: "نوع مکتب", gender_type_code: "نوع جنسیت", school_code: "کد مکتب", school_formation: "تشکیل مکتب",
  senior_teacher_count: "تعداد سرمعلم", male_teacher_count: "تعداد معلم ذکور", female_teacher_count: "تعداد معلم اناث", incoming_service_teacher_count: "معلم خدماتی ورودی", outgoing_service_teacher_count: "معلم خدماتی خروجی", volunteer_teacher_count: "تعداد معلم رضاکار", active_class_section_count: "صنوف فعال", school_needs: "نیازمندی‌های مکتب", school_equipment: "تجهیزات مکتب",
  grade_statistics: "آمار صنوف", grade_number: "صنف", section_name: "شعبه", sections: "شعبات", enrolled_count: "داخله", present_count: "حاضر", male_count: "ذکور", female_count: "اناث", totals: "مجموع",
  filters: "فیلترها", sorting: "ترتیب نمایش", sort_by: "مرتب‌سازی بر اساس", sort_order: "جهت ترتیب", search: "جستجو", date_from: "از تاریخ", date_to: "تا تاریخ", observation_date_from: "از تاریخ مشاهده", observation_date_to: "تا تاریخ مشاهده",
};
export const getAuditFieldLabel = (key: string) => fieldLabels[key] ?? "اطلاعات دیگر";
export function isSensitiveAuditKey(key: string) {
  return /(password|token|secret|authorization|credential|api_?key|cookie)/i.test(key.replace(/[-\s]/g, "_"));
}
/** Defense in depth for snapshots, including nested metadata and arrays. */
export function sanitizeAuditJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sanitizeAuditJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !isSensitiveAuditKey(key)).map(([key, child]) => [key, sanitizeAuditJson(child)]));
  return value;
}
export function formatAuditValue(key: string, value: string | number | boolean | null, entity: string): string {
  if (value === null) return key === "final_result_code" ? "تعیین نشده" : "ثبت نشده";
  if (typeof value === "boolean") return key === "is_active" ? value ? "فعال" : "غیرفعال" : value ? "بلی" : "نخیر";
  if (typeof value === "number") return value.toLocaleString("fa-AF");
  if (key === "role_code") return value === "admin" || value === "user" ? getRoleLabel(value) : "نامشخص";
  if (key === "job_title_code" || key === "employee_job_title_code") return getJobTitleLabel(value);
  if (key === "field_match_code") return getFieldMatchLabel(value);
  if (key === "school_type_code") return getSchoolTypeLabel(value);
  if (key === "gender_type_code") return getGenderTypeLabel(value);
  if (key === "code") return getDepartmentLabel(value);
  if (key === "action") return getAuditActionLabel(value);
  if (key === "entity_type") return getAuditEntityLabel(value);
  if (key === "final_result_code") return getFinalResultLabel(value, entity.includes("amir") ? "amir_senior_teacher" : "teacher");
  if (key === "observation_type") return value === "teacher" || value === "amir_senior_teacher" ? getObservationTypeLabel(value) : "نامشخص";
  if (key === "sort_by") return getAuditFieldLabel(value);
  if (key === "sort_order") return value === "asc" ? "صعودی" : "نزولی";
  return value;
}

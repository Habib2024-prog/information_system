export const jobTitleLabels: Record<string, string> = {
  teacher: "معلم",
  senior_teacher: "سرمعلم",
  manager: "مدیر",
  amir: "آمر",
};

export const fieldMatchLabels: Record<string, string> = {
  in_field: "مطابق رشته",
  out_of_field: "خلاف رشته",
};

export const educationLevelOptions = ["۱۲ پاس", "۱۴ پاس", "لیسانس", "ماستر"];

export function getJobTitleLabel(code: string): string {
  return jobTitleLabels[code] ?? "نامشخص";
}

export function getFieldMatchLabel(code: string): string {
  return fieldMatchLabels[code] ?? "نامشخص";
}

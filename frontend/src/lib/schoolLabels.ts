export const schoolTypeLabels: Record<string, string> = {
  high_school: "لیسه",
  middle_school: "متوسطه",
  primary_school: "ابتداییه",
};

export const genderTypeLabels: Record<string, string> = {
  boys: "پسرانه",
  girls: "دخترانه",
  mixed: "مختلط",
};

export const schoolTypeOptions = Object.entries(schoolTypeLabels).map(([value, label]) => ({ value, label }));
export const genderTypeOptions = Object.entries(genderTypeLabels).map(([value, label]) => ({ value, label }));

export function getSchoolTypeLabel(code: string): string {
  return schoolTypeLabels[code] ?? "نامشخص";
}

export function getGenderTypeLabel(code: string): string {
  return genderTypeLabels[code] ?? "نامشخص";
}

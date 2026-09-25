const departmentLabels: Record<string, string> = {
  education_training: "تعلیم و تربیه",
  dari_language_literature: "زبان و ادبیات دری",
  pashto_language_literature: "زبان و ادبیات پشتو",
  arabic_language: "زبان و ادبیات عربی",
  science: "ساینس",
  mathematics: "ریاضی",
  english_language_literature: "زبان و ادبیات انگلیسی",
  social_sciences: "علوم اجتماعی",
  religious_sciences: "علوم دینی",
  computer: "کمپیوتر",
};

export function getDepartmentLabel(code: string, fallback = "دیپارتمنت نامشخص"): string {
  return departmentLabels[code] ?? fallback;
}

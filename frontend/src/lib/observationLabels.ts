const teacherFinalLabels: Record<string, string> = { needs_improvement: "نیازمند بهبود", has_capability: "دارای قابلیت", mastery: "تسلط بر قابلیت" };
const amirFinalLabels: Record<string, string> = { basic_capability: "قابلیت ابتدایی", applied_capability: "قابلیت بکارگیری", mastery: "مسلط بر قابلیت" };

export function getObservationTypeLabel(type: "teacher" | "amir_senior_teacher") { return type === "teacher" ? "مشاهده معلم" : "مشاهده آمر / سرمعلم"; }
export function getFinalResultLabel(code: string | null, type: "teacher" | "amir_senior_teacher") { if (!code) return "تعیین نشده"; return (type === "teacher" ? teacherFinalLabels : amirFinalLabels)[code] ?? "تعیین نشده"; }

function level(score: number, first: string) { if (score >= 0 && score <= 0.75) return first; if (score >= 0.76 && score <= 1.5) return "نیازمند بهبود"; if (score >= 1.6 && score <= 2.25) return "دارای قابلیت"; if (score >= 2.26 && score <= 3) return "تسلط بر قابلیت"; return null; }
function format(score: number, first: string) { const label = level(score, first); return label ? `${score.toFixed(2)} - ${label}` : score.toFixed(2); }
export const formatTeacherCompetency = (score: number) => format(score, "قابلیت مشاهده نشد");
export const formatAmirCompetency = (score: number) => format(score, "غیر قابل ارزیابی");

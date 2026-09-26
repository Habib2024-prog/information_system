import { getDepartmentLabel } from "../../lib/departmentLabels";
import { getFieldMatchLabel, getJobTitleLabel } from "../../lib/employeeLabels";
import type { Employee } from "../../types/api";
import { AppDialog } from "../shared/AppDialog";
import { Button } from "../ui/button";

interface EmployeeDetailsDialogProps { employee: Employee | null; onOpenChange: (open: boolean) => void; }

export function EmployeeDetailsDialog({ employee, onOpenChange }: EmployeeDetailsDialogProps) {
  return <AppDialog open={Boolean(employee)} onOpenChange={onOpenChange} size="lg" title="جزئیات کارمند" description={employee ? `شمارهٔ ثبت: ${employee.id.toLocaleString("fa-AF")}` : ""} footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>بستن</Button>}>
    {employee ? <div className="space-y-6"><DetailSection title="مشخصات کارمند"><Detail label="اسم" value={employee.name} /><Detail label="ولد" value={employee.father_name} /><Detail label="ولدیت" value={employee.grandfather_name} /><Detail label="مکتب / محل وظیفه" value={employee.school_workplace} /><Detail label="شهر / ولسوالی" value={employee.city_district} /><Detail label="شماره تماس" value={employee.phone_number} ltr /><Detail label="رشته تحصیلی" value={employee.field_of_study} /><Detail label="درجه تحصیل" value={employee.education_level} /><Detail label="عنوان وظیفه" value={getJobTitleLabel(employee.job_title_code)} /><Detail label="سابقه تدریس" value={String(employee.teaching_experience)} /><Detail label="بست" value={String(employee.grade_post)} /><Detail label="قدم" value={String(employee.step)} /><Detail label="مطابق رشته" value={getFieldMatchLabel(employee.field_match_code)} /></DetailSection><DetailSection title="اطلاعات تکمیلی"><Detail label="دیپارتمنت‌های مربوطه" value={employee.departments.map((department) => getDepartmentLabel(department.code, department.display_name)).join("، ") || "—"} wide /><Detail label="مضامین که تدریس می‌کند" value={employee.subjects_taught} wide /><Detail label="ارزیابی موفق" value={employee.successful_evaluation} wide /><Detail label="ملاحظات" value={employee.notes || "—"} wide /></DetailSection></div> : null}
  </AppDialog>;
}
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl></section>; }
function Detail({ label, value, wide = false, ltr = false }: { label: string; value: string; wide?: boolean; ltr?: boolean }) { return <div className={`rounded-lg border border-line bg-slate-50/70 px-3 py-2.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}><dt className="text-xs text-muted">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{value}</dd></div>; }

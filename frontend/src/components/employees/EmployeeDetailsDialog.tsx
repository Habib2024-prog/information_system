import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import type { Employee } from "../../types/api";
import { getFieldMatchLabel, getJobTitleLabel } from "../../lib/employeeLabels";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { Button } from "../ui/button";

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailsDialog({ employee, onOpenChange }: EmployeeDetailsDialogProps) {
  return (
    <Dialog.Root open={Boolean(employee)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed inset-x-3 top-1/2 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-4xl -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-white shadow-panel sm:inset-x-6">
          {employee ? <>
            <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
              <div>
                <Dialog.Title className="text-base font-bold text-ink">جزئیات کارمند</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">شمارهٔ ثبت: {employee.id}</Dialog.Description>
              </div>
              <Dialog.Close asChild><button className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="بستن"><X size={19} /></button></Dialog.Close>
            </div>
            <div className="space-y-6 px-5 py-5 sm:px-6">
              <DetailSection title="مشخصات کارمند">
                <Detail label="اسم" value={employee.name} />
                <Detail label="ولد" value={employee.father_name} />
                <Detail label="ولدیت" value={employee.grandfather_name} />
                <Detail label="مکتب / محل وظیفه" value={employee.school_workplace} />
                <Detail label="شهر / ولسوالی" value={employee.city_district} />
                <Detail label="شماره تماس" value={employee.phone_number} ltr />
                <Detail label="رشته تحصیلی" value={employee.field_of_study} />
                <Detail label="درجه تحصیل" value={employee.education_level} />
                <Detail label="عنوان وظیفه" value={getJobTitleLabel(employee.job_title_code)} />
                <Detail label="سابقه تدریس" value={employee.teaching_experience} />
                <Detail label="بست" value={employee.grade_post} />
                <Detail label="قدم" value={employee.step} />
                <Detail label="مطابق رشته" value={getFieldMatchLabel(employee.field_match_code)} />
              </DetailSection>
              <DetailSection title="اطلاعات تکمیلی">
                <Detail label="دیپارتمنت‌های مربوطه" value={employee.departments.map((department) => getDepartmentLabel(department.code, department.display_name)).join("، ") || "—"} />
                <Detail label="مضامین که تدریس می‌کند" value={employee.subjects_taught} wide />
                <Detail label="ارزیابی موفق" value={employee.successful_evaluation} wide />
                <Detail label="ملاحظات" value={employee.notes || "—"} wide />
              </DetailSection>
            </div>
            <div className="flex justify-end border-t border-line px-5 py-4 sm:px-6"><Dialog.Close asChild><Button variant="secondary">بستن</Button></Dialog.Close></div>
          </> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-sm font-bold text-ink">{title}</h2><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl></section>;
}

function Detail({ label, value, wide = false, ltr = false }: { label: string; value: string | number; wide?: boolean; ltr?: boolean }) {
  return <div className={`rounded-lg bg-slate-50 px-3 py-2.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}><dt className="text-xs text-muted">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{value}</dd></div>;
}

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { School } from "../../types/api";
import { schoolServiceCountLabels } from "../../lib/schoolLabels";
import { AppDialog } from "../shared/AppDialog";
import { Button } from "../ui/button";

interface SchoolDetailsDialogProps {
  school: School | null;
  onOpenChange: (open: boolean) => void;
}

const countRows: Array<{ key: keyof School; label: string }> = [
  { key: "senior_teacher_count", label: "تعداد سرمعلم" },
  { key: "male_teacher_count", label: "تعداد معلم ذکور" },
  { key: "female_teacher_count", label: "تعداد معلم اناث" },
  { key: "incoming_service_teacher_count", label: schoolServiceCountLabels.incoming_service_teacher_count },
  { key: "outgoing_service_teacher_count", label: schoolServiceCountLabels.outgoing_service_teacher_count },
  { key: "volunteer_teacher_count", label: "تعداد معلم رضاکار" },
  { key: "active_class_section_count", label: "تعداد صنوف / شعبات فعال" },
];

function DisplayField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rounded-lg border border-line/70 bg-slate-50/50 px-3 py-2.5"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink">{children}</dd></div>;
}

function GradeStatistics({ school }: { school: School }) {
  const byGrade = new Map(school.grade_statistics.map((item) => [item.grade_number, item]));
  const [openGrade, setOpenGrade] = useState<number | null>(null);
  return <div className="space-y-2">{Array.from({ length: 12 }, (_, index) => index + 1).map((gradeNumber) => {
    const grade = byGrade.get(gradeNumber);
    const open = openGrade === gradeNumber;
    return <section key={gradeNumber} className="overflow-hidden rounded-lg border border-line/70 bg-slate-50/40"><button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-3 text-right transition hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" onClick={() => setOpenGrade((current) => current === gradeNumber ? null : gradeNumber)} aria-expanded={open}><span className="font-medium text-ink">صنف {gradeNumber.toLocaleString("fa-AF")}</span><span className="flex items-center gap-2 text-xs text-muted">{(grade?.sections.length ?? 0).toLocaleString("fa-AF")} شعبه<ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} /></span></button>{open ? <div className="border-t border-line px-3 pb-3 pt-3">{grade?.sections.length ? <><div className="app-scrollbar overflow-x-auto rounded-md border border-line bg-white"><table className="w-full min-w-[34rem] text-sm"><thead className="bg-slate-50 text-muted"><tr><th className="px-3 py-2 text-right font-semibold">شعبه</th><th className="px-3 py-2 text-right font-semibold">داخله</th><th className="px-3 py-2 text-right font-semibold">حاضر</th><th className="px-3 py-2 text-right font-semibold">ذکور</th><th className="px-3 py-2 text-right font-semibold">اناث</th></tr></thead><tbody className="divide-y divide-line/70">{grade.sections.map((section) => <tr key={section.id}><td className="px-3 py-2 font-medium text-ink">{section.section_name}</td><td className="px-3 py-2">{section.enrolled_count.toLocaleString("fa-AF")}</td><td className="px-3 py-2">{section.present_count.toLocaleString("fa-AF")}</td><td className="px-3 py-2">{section.male_count.toLocaleString("fa-AF")}</td><td className="px-3 py-2">{section.female_count.toLocaleString("fa-AF")}</td></tr>)}</tbody></table></div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><DisplayField label="مجموع داخله">{grade.totals.enrolled_count.toLocaleString("fa-AF")}</DisplayField><DisplayField label="مجموع حاضر">{grade.totals.present_count.toLocaleString("fa-AF")}</DisplayField><DisplayField label="مجموع ذکور">{grade.totals.male_count.toLocaleString("fa-AF")}</DisplayField><DisplayField label="مجموع اناث">{grade.totals.female_count.toLocaleString("fa-AF")}</DisplayField></dl></> : <p className="text-sm text-muted">برای این صنف شعبه‌ای ثبت نشده است.</p>}</div> : null}</section>;
  })}</div>;
}

export function SchoolDetailsDialog({ school, onOpenChange }: SchoolDetailsDialogProps) {
  return <AppDialog open={Boolean(school)} onOpenChange={onOpenChange} title="جزئیات مکتب" description={school ? school.school_name : ""} size="xl" footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>بستن</Button>}>
    {school ? <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">اطلاعات اصلی</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DisplayField label="نام مکتب">{school.school_name}</DisplayField>
          <DisplayField label="کد مکتب"><span dir="ltr" className="inline-block">{school.school_code}</span></DisplayField>
          <DisplayField label="شماره تماس مسئول مکتب">{school.school_head_phone ? <span dir="ltr" className="inline-block">{school.school_head_phone}</span> : "—"}</DisplayField>
          <DisplayField label="نوع مکتب">{school.school_type_display_name}</DisplayField>
          <DisplayField label="نوع جنسیت">{school.gender_type_display_name}</DisplayField>
          <DisplayField label="تشکیل مکتب">{school.school_formation}</DisplayField>
        </dl>
      </section>
      <section className="border-t border-line pt-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">آمار تشکیلاتی</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{countRows.map(({ key, label }) => <DisplayField key={String(key)} label={label}>{Number(school[key]).toLocaleString("fa-AF")}</DisplayField>)}</dl>
      </section>
      <section className="border-t border-line pt-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">آمار شاگردان صنف‌های ۱ تا ۱۲</h2>
        <GradeStatistics school={school} />
      </section>
      <section className="grid gap-4 border-t border-line pt-5 lg:grid-cols-2">
        <DisplayField label="نیازمندی‌های مکتب">{school.school_needs || "—"}</DisplayField>
        <DisplayField label="تجهیزات مکتب">{school.school_equipment || "—"}</DisplayField>
      </section>
    </div> : null}
  </AppDialog>;
}

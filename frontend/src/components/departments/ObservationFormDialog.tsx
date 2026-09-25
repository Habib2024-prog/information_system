import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createAmirObservation, createTeacherObservation, updateAmirObservation, updateTeacherObservation, type AmirObservationDetail, type TeacherObservationDetail } from "../../api/observations";
import { getScientificMembers } from "../../api/scientificMembers";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { getJobTitleLabel } from "../../lib/employeeLabels";
import type { Employee, ScientificMember } from "../../types/api";
import { isValidCompetencyScore, ScoreInput, scoreValidationMessage } from "../shared/ScoreInput";
import { Button } from "../ui/button";

export type ObservationKind = "teacher" | "amir";
export type EditableObservation = TeacherObservationDetail | AmirObservationDetail;

interface ObservationFormDialogProps {
  employee: Employee | null;
  kind: ObservationKind | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialObservation?: EditableObservation | null;
}

interface CommonValues {
  observerId: string;
  observationDate: string;
  observedClass: string;
  subject: string;
  strengths: string;
  improvements: string;
  notes: string;
}

const teacherCompetencies = [
  { key: "subject_knowledge_score", label: "دانش مضمونی" },
  { key: "lesson_plan_score", label: "پلان درسی" },
  { key: "classroom_management_score", label: "مدیریت صنف" },
  { key: "assessment_score", label: "ارزیابی" },
  { key: "professional_learning_score", label: "آموزش‌های مسلکی" },
  { key: "community_engagement_score", label: "ارتباط با اجتماع" },
] as const;

const amirCompetencies = [
  { key: "responsibility_score", label: "مسوولیت پذیری" },
  { key: "professional_leadership_score", label: "رهبری مسلکی" },
  { key: "community_relations_score", label: "روابط با جامعه" },
  { key: "professional_development_score", label: "انکشاف مسلکی" },
] as const;

const today = () => {
  const current = new Date();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${current.getFullYear()}-${month}-${day}`;
};

function emptyCommonValues(): CommonValues {
  return { observerId: "", observationDate: today(), observedClass: "", subject: "", strengths: "", improvements: "", notes: "" };
}

function emptyScores(kind: ObservationKind): Record<string, string> {
  return Object.fromEntries((kind === "teacher" ? teacherCompetencies : amirCompetencies).map(({ key }) => [key, ""]));
}

export function ObservationFormDialog({ employee, kind, onOpenChange, onSaved, initialObservation = null }: ObservationFormDialogProps) {
  const open = Boolean(employee && kind);
  const [values, setValues] = useState<CommonValues>(emptyCommonValues);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<ScientificMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [dateError, setDateError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !kind) return;
    if (initialObservation) {
      setValues({ observerId: String(initialObservation.observer.id), observationDate: initialObservation.observation_date, observedClass: initialObservation.observed_class, subject: initialObservation.subject, strengths: initialObservation.strengths ?? "", improvements: initialObservation.improvements ?? "", notes: initialObservation.notes ?? "" });
      setScores(kind === "teacher" ? {
        subject_knowledge_score: String((initialObservation as TeacherObservationDetail).subject_knowledge_score), lesson_plan_score: String((initialObservation as TeacherObservationDetail).lesson_plan_score), classroom_management_score: String((initialObservation as TeacherObservationDetail).classroom_management_score), assessment_score: String((initialObservation as TeacherObservationDetail).assessment_score), professional_learning_score: String((initialObservation as TeacherObservationDetail).professional_learning_score), community_engagement_score: String((initialObservation as TeacherObservationDetail).community_engagement_score),
      } : {
        responsibility_score: String((initialObservation as AmirObservationDetail).responsibility_score), professional_leadership_score: String((initialObservation as AmirObservationDetail).professional_leadership_score), community_relations_score: String((initialObservation as AmirObservationDetail).community_relations_score), professional_development_score: String((initialObservation as AmirObservationDetail).professional_development_score),
      });
    } else { setValues(emptyCommonValues()); setScores(emptyScores(kind)); }
    setMemberSearch("");
    setValidationError("");
    setDateError("");
    setSubmissionError("");
    setIsMembersLoading(true);
    setMembersError("");
    getScientificMembers()
      .then((response) => setMembers(response.items))
      .catch(() => setMembersError("دریافت فهرست مشاهده‌کنندگان با مشکل روبه‌رو شد."))
      .finally(() => setIsMembersLoading(false));
  }, [initialObservation, kind, open]);

  const visibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase();
    if (!query) return members;
    return members.filter((member) => `${member.name} ${member.surname} ${member.father_name}`.toLocaleLowerCase().includes(query));
  }, [memberSearch, members]);

  const competencies = kind === "teacher" ? teacherCompetencies : amirCompetencies;
  const title = initialObservation ? "ویرایش مشاهده" : kind === "teacher" ? "ثبت مشاهدهٔ معلم" : "ثبت مشاهدهٔ آمر / سرمعلم";
  const observerName = members.find((member) => String(member.id) === values.observerId);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employee || !kind) return;
    if (!values.observerId || !values.observationDate || !values.observedClass.trim() || !values.subject.trim()) {
      setValidationError("تمام فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    if (values.observationDate > today()) {
      setDateError("تاریخ مشاهده نمی‌تواند بعد از امروز باشد.");
      return;
    }
    if (competencies.some(({ key }) => !isValidCompetencyScore(scores[key] ?? ""))) {
      setValidationError(scoreValidationMessage);
      return;
    }
    setValidationError("");
    setSubmissionError("");
    setIsSubmitting(true);
    const common = {
      observer_scientific_member_id: Number(values.observerId),
      observation_date: values.observationDate,
      observed_class: values.observedClass.trim(),
      subject: values.subject.trim(),
      strengths: values.strengths.trim() || null,
      improvements: values.improvements.trim() || null,
      notes: values.notes.trim() || null,
    };
    try {
      if (kind === "teacher") {
        const payload = {
          ...common,
          subject_knowledge_score: Number(scores.subject_knowledge_score),
          lesson_plan_score: Number(scores.lesson_plan_score),
          classroom_management_score: Number(scores.classroom_management_score),
          assessment_score: Number(scores.assessment_score),
          professional_learning_score: Number(scores.professional_learning_score),
          community_engagement_score: Number(scores.community_engagement_score),
        };
        if (initialObservation) await updateTeacherObservation(employee.id, initialObservation.id, payload);
        else await createTeacherObservation(employee.id, payload);
      } else {
        const payload = {
          ...common,
          responsibility_score: Number(scores.responsibility_score),
          professional_leadership_score: Number(scores.professional_leadership_score),
          community_relations_score: Number(scores.community_relations_score),
          professional_development_score: Number(scores.professional_development_score),
        };
        if (initialObservation) await updateAmirObservation(employee.id, initialObservation.id, payload);
        else await createAmirObservation(employee.id, payload);
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setSubmissionError("ثبت مشاهده با مشکل روبه‌رو شد. لطفاً اطلاعات را بررسی کرده و دوباره کوشش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100vh-1rem)] flex-col rounded-t-2xl border border-line bg-white shadow-panel sm:inset-x-6 sm:top-1/2 sm:bottom-auto sm:max-w-4xl sm:-translate-y-1/2 sm:rounded-xl lg:inset-x-auto lg:right-1/2 lg:w-full lg:translate-x-1/2">
    {employee && kind ? <><div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6"><div><Dialog.Title className="text-base font-bold text-ink">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">ارزیابی و نتیجهٔ نهایی توسط سیستم محاسبه می‌شود.</Dialog.Description></div><Dialog.Close asChild><button className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="بستن"><X size={19} /></button></Dialog.Close></div>
      <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"><EmployeeIdentity employee={employee} /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="تاریخ مشاهده" required><input type="date" max={today()} className="input" value={values.observationDate} onChange={(event) => { const observationDate = event.target.value; setValues((current) => ({ ...current, observationDate })); setDateError(observationDate > today() ? "تاریخ مشاهده نمی‌تواند بعد از امروز باشد." : ""); }} />{dateError ? <p className="mt-1 text-xs text-rose-700">{dateError}</p> : null}</Field><Field label="صنف مشاهده شده" required><input className="input" value={values.observedClass} onChange={(event) => setValues((current) => ({ ...current, observedClass: event.target.value }))} /></Field><Field label="مضمون" required><input className="input" value={values.subject} onChange={(event) => setValues((current) => ({ ...current, subject: event.target.value }))} /></Field><Field label="مشاهده‌کننده" required><div className="space-y-2"><label className="relative block"><Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={15} /><input className="input pr-9" placeholder="جستجوی مشاهده‌کننده" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></label><select className="input" value={values.observerId} onChange={(event) => setValues((current) => ({ ...current, observerId: event.target.value }))} disabled={isMembersLoading || Boolean(membersError)}><option value="">{isMembersLoading ? "در حال دریافت مشاهده‌کنندگان" : "انتخاب مشاهده‌کننده"}</option>{visibleMembers.map((member) => <option key={member.id} value={member.id}>{member.name} {member.surname} — {member.father_name}</option>)}</select>{membersError ? <p className="text-xs text-rose-700">{membersError}</p> : observerName ? <p className="text-xs text-muted">انتخاب شده: {observerName.name} {observerName.surname}</p> : null}</div></Field></div>
      <section className="mt-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-bold text-ink">قابلیت‌ها</h2><CompetencyGuidance kind={kind} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{competencies.map(({ key, label }) => <Field key={key} label={label} required><ScoreInput placeholder="۰ تا ۳" value={scores[key] ?? ""} error={Boolean(scores[key]) && !isValidCompetencyScore(scores[key] ?? "")} onChange={(event) => setScores((current) => ({ ...current, [key]: event.target.value }))} /></Field>)}</div></section>
      <section className="mt-6 grid gap-4 border-t border-line pt-5 lg:grid-cols-3"><Field label="نکات قوت"><textarea className="textarea" value={values.strengths} onChange={(event) => setValues((current) => ({ ...current, strengths: event.target.value }))} /></Field><Field label="نکات قابل اصلاح"><textarea className="textarea" value={values.improvements} onChange={(event) => setValues((current) => ({ ...current, improvements: event.target.value }))} /></Field><Field label="ملاحظات"><textarea className="textarea" value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} /></Field></section>
      {validationError ? <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{validationError}</p> : null}{submissionError ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submissionError}</p> : null}</div><div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6"><Dialog.Close asChild><Button disabled={isSubmitting} variant="secondary">انصراف</Button></Dialog.Close><Button type="submit" disabled={isSubmitting || isMembersLoading || Boolean(membersError)} variant="primary">{isSubmitting ? <><LoaderCircle className="animate-spin" size={16} />در حال ثبت</> : "ثبت مشاهده"}</Button></div></form></> : null}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function EmployeeIdentity({ employee }: { employee: Employee }) {
  const departmentNames = employee.departments.map((department) => getDepartmentLabel(department.code, department.display_name)).join("، ") || "—";
  return <section className="rounded-xl border border-line bg-slate-50/80 p-4"><h2 className="text-sm font-bold text-ink">مشخصات کارمند</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><Identity label="اسم" value={employee.name} /><Identity label="ولد" value={employee.father_name} /><Identity label="محل وظیفه" value={employee.school_workplace} /><Identity label="دیپارتمنت" value={departmentNames} /><Identity label="عنوان وظیفه" value={getJobTitleLabel(employee.job_title_code)} /></dl></section>;
}

function Identity({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-ink">{value}</dd></div>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">{label}{required ? <span className="mr-1 text-rose-700">*</span> : null}</span>{children}</label>;
}

function CompetencyGuidance({ kind }: { kind: ObservationKind }) {
  const firstLabel = kind === "teacher" ? "قابلیت مشاهده نشد" : "غیر قابل ارزیابی";
  return <details className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted"><summary className="cursor-pointer font-medium text-ink">راهنمای نمره‌دهی</summary><div className="mt-2 grid gap-1 leading-5"><p>۰ تا ۰.۷۵: {firstLabel}</p><p>۰.۷۶ تا ۱.۵: نیازمند بهبود</p><p>۱.۶ تا ۲.۲۵: دارای قابلیت</p><p>۲.۲۶ تا ۳: تسلط بر قابلیت</p><p className="pt-1">برای فاصله‌های اعشاریِ تعریف‌نشده، سیستم تعیین‌کننده است.</p></div></details>;
}

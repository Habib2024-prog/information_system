import { ChevronDown, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { createSchool, updateSchool, type SchoolPayload } from "../../api/schools";
import { genderTypeOptions, schoolTypeOptions } from "../../lib/schoolLabels";
import type { School } from "../../types/api";
import { AppDialog } from "../shared/AppDialog";
import { SearchableSelect } from "../shared/SearchableSelect";
import { Button } from "../ui/button";

type CountField = "enrolled_count" | "present_count" | "male_count" | "female_count";
type SchoolCountField =
  | "senior_teacher_count"
  | "male_teacher_count"
  | "female_teacher_count"
  | "incoming_service_teacher_count"
  | "outgoing_service_teacher_count"
  | "volunteer_teacher_count"
  | "active_class_section_count";

interface GradeSectionForm {
  id?: number;
  clientId: string;
  section_name: string;
  enrolled_count: string;
  present_count: string;
  male_count: string;
  female_count: string;
}

interface GradeFormGroup {
  grade_number: number;
  sections: GradeSectionForm[];
}

interface SchoolFormValues {
  school_name: string;
  school_head_phone: string;
  school_type_code: string;
  gender_type_code: string;
  school_code: string;
  school_formation: string;
  senior_teacher_count: string;
  male_teacher_count: string;
  female_teacher_count: string;
  incoming_service_teacher_count: string;
  outgoing_service_teacher_count: string;
  volunteer_teacher_count: string;
  active_class_section_count: string;
  school_needs: string;
  school_equipment: string;
  grade_statistics: GradeFormGroup[];
}

type FormErrors = Partial<Record<Exclude<keyof SchoolFormValues, "grade_statistics">, string>> & {
  grades?: Record<number, string[]>;
};

const schoolCountFields: SchoolCountField[] = [
  "senior_teacher_count",
  "male_teacher_count",
  "female_teacher_count",
  "incoming_service_teacher_count",
  "outgoing_service_teacher_count",
  "volunteer_teacher_count",
  "active_class_section_count",
];

const countLabels: Record<CountField, string> = {
  enrolled_count: "داخله",
  present_count: "حاضر",
  male_count: "ذکور",
  female_count: "اناث",
};

function makeGrades(school?: School): GradeFormGroup[] {
  return Array.from({ length: 12 }, (_, index) => {
    const gradeNumber = index + 1;
    const statistic = school?.grade_statistics.find((item) => item.grade_number === gradeNumber);
    return {
      grade_number: gradeNumber,
      sections: statistic?.sections.map((section) => ({
        id: section.id,
        clientId: `saved-${section.id}`,
        section_name: section.section_name,
        enrolled_count: String(section.enrolled_count),
        present_count: String(section.present_count),
        male_count: String(section.male_count),
        female_count: String(section.female_count),
      })) ?? [],
    };
  });
}

function emptyValues(): SchoolFormValues {
  return {
    school_name: "", school_head_phone: "", school_type_code: "", gender_type_code: "", school_code: "", school_formation: "",
    senior_teacher_count: "0", male_teacher_count: "0", female_teacher_count: "0", incoming_service_teacher_count: "0", outgoing_service_teacher_count: "0", volunteer_teacher_count: "0", active_class_section_count: "0",
    school_needs: "", school_equipment: "", grade_statistics: makeGrades(),
  };
}

function schoolToValues(school?: School): SchoolFormValues {
  if (!school) return emptyValues();
  return {
    school_name: school.school_name,
    school_head_phone: school.school_head_phone ?? "",
    school_type_code: school.school_type_code,
    gender_type_code: school.gender_type_code,
    school_code: school.school_code,
    school_formation: school.school_formation,
    senior_teacher_count: String(school.senior_teacher_count),
    male_teacher_count: String(school.male_teacher_count),
    female_teacher_count: String(school.female_teacher_count),
    incoming_service_teacher_count: String(school.incoming_service_teacher_count),
    outgoing_service_teacher_count: String(school.outgoing_service_teacher_count),
    volunteer_teacher_count: String(school.volunteer_teacher_count),
    active_class_section_count: String(school.active_class_section_count),
    school_needs: school.school_needs ?? "",
    school_equipment: school.school_equipment ?? "",
    grade_statistics: makeGrades(school),
  };
}

function validate(values: SchoolFormValues): FormErrors {
  const errors: FormErrors = {};
  (["school_name", "school_type_code", "gender_type_code", "school_code", "school_formation"] as const).forEach((field) => {
    if (!values[field].trim()) errors[field] = "این فیلد الزامی است.";
  });
  schoolCountFields.forEach((field) => {
    const value = Number(values[field]);
    if (!Number.isInteger(value) || value < 0) errors[field] = "عدد صحیحِ صفر یا بیشتر وارد کنید.";
  });

  const gradeErrors: Record<number, string[]> = {};
  values.grade_statistics.forEach((grade) => {
    const messages: string[] = [];
    const names = grade.sections.map((section) => section.section_name.trim());
    if (names.some((name) => !name)) messages.push("نام همه شعبه‌ها را وارد کنید.");
    if (names.length !== new Set(names).size) messages.push("نام شعبه در این صنف تکراری است.");
    grade.sections.forEach((section) => {
      const counts = (["enrolled_count", "present_count", "male_count", "female_count"] as CountField[]).map((field) => Number(section[field]));
      if (counts.some((count) => !Number.isInteger(count) || count < 0)) messages.push("مقادیر شعبه باید عدد صحیحِ صفر یا بیشتر باشند.");
      if (Number(section.present_count) > Number(section.enrolled_count)) messages.push("تعداد حاضر نمی‌تواند بیشتر از تعداد داخله باشد.");
      if (Number(section.male_count) > Number(section.enrolled_count)) messages.push("تعداد ذکور نمی‌تواند بیشتر از تعداد داخله باشد.");
      if (Number(section.female_count) > Number(section.enrolled_count)) messages.push("تعداد اناث نمی‌تواند بیشتر از تعداد داخله باشد.");
      if (Number(section.male_count) + Number(section.female_count) > Number(section.enrolled_count)) messages.push("مجموع ذکور و اناث نمی‌تواند بیشتر از تعداد داخله باشد.");
    });
    if (messages.length) gradeErrors[grade.grade_number] = [...new Set(messages)];
  });
  if (Object.keys(gradeErrors).length) errors.grades = gradeErrors;
  return errors;
}

function toPayload(values: SchoolFormValues): SchoolPayload {
  return {
    school_name: values.school_name.trim(),
    school_head_phone: values.school_head_phone.trim() || null,
    school_type_code: values.school_type_code,
    gender_type_code: values.gender_type_code,
    school_code: values.school_code.trim(),
    school_formation: values.school_formation.trim(),
    senior_teacher_count: Number(values.senior_teacher_count),
    male_teacher_count: Number(values.male_teacher_count),
    female_teacher_count: Number(values.female_teacher_count),
    incoming_service_teacher_count: Number(values.incoming_service_teacher_count),
    outgoing_service_teacher_count: Number(values.outgoing_service_teacher_count),
    volunteer_teacher_count: Number(values.volunteer_teacher_count),
    active_class_section_count: Number(values.active_class_section_count),
    school_needs: values.school_needs.trim() || null,
    school_equipment: values.school_equipment.trim() || null,
    grade_statistics: values.grade_statistics.filter((grade) => grade.sections.length).map((grade) => ({
      grade_number: grade.grade_number,
      sections: grade.sections.map((section) => ({
        ...(section.id ? { id: section.id } : {}),
        section_name: section.section_name.trim(),
        enrolled_count: Number(section.enrolled_count),
        present_count: Number(section.present_count),
        male_count: Number(section.male_count),
        female_count: Number(section.female_count),
      })),
    })),
  };
}

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School;
  onSaved: (message: string) => void;
}

export function SchoolFormDialog({ open, onOpenChange, school, onSaved }: SchoolFormDialogProps) {
  const [values, setValues] = useState<SchoolFormValues>(() => schoolToValues(school));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openGrade, setOpenGrade] = useState<number | null>(1);

  useEffect(() => {
    if (!open) return;
    setValues(schoolToValues(school));
    setErrors({});
    setSubmitError("");
    setOpenGrade(1);
  }, [open, school]);

  const setValue = <K extends Exclude<keyof SchoolFormValues, "grade_statistics">>(key: K, value: SchoolFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const addSection = (gradeNumber: number) => setValues((current) => ({ ...current, grade_statistics: current.grade_statistics.map((grade) => grade.grade_number === gradeNumber ? { ...grade, sections: [...grade.sections, { clientId: `new-${crypto.randomUUID()}`, section_name: "", enrolled_count: "0", present_count: "0", male_count: "0", female_count: "0" }] } : grade) }));
  const removeSection = (gradeNumber: number, clientId: string) => setValues((current) => ({ ...current, grade_statistics: current.grade_statistics.map((grade) => grade.grade_number === gradeNumber ? { ...grade, sections: grade.sections.filter((section) => section.clientId !== clientId) } : grade) }));
  const updateSection = (gradeNumber: number, clientId: string, field: keyof Omit<GradeSectionForm, "id" | "clientId">, value: string) => setValues((current) => ({ ...current, grade_statistics: current.grade_statistics.map((grade) => grade.grade_number === gradeNumber ? { ...grade, sections: grade.sections.map((section) => section.clientId === clientId ? { ...section, [field]: value } : section) } : grade) }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).some((key) => key !== "grades") || Object.keys(nextErrors.grades ?? {}).length) return;
    setSaving(true);
    setSubmitError("");
    try {
      if (school) {
        await updateSchool(school.id, toPayload(values));
        onSaved("اطلاعات مکتب به‌روزرسانی شد.");
      } else {
        await createSchool(toPayload(values));
        onSaved("مکتب جدید با موفقیت ثبت شد.");
      }
      onOpenChange(false);
    } catch {
      setSubmitError("ثبت اطلاعات با مشکل روبه‌رو شد. داده‌ها را بررسی کرده و دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  const editing = Boolean(school);
  return <AppDialog open={open} onOpenChange={onOpenChange} size="xl" title={editing ? "ویرایش مکتب" : "افزودن مکتب"} description="اطلاعات مکتب، شعبه‌ها و آمار شاگردان را تکمیل کنید." footer={<><Button disabled={saving} variant="secondary" onClick={() => onOpenChange(false)}>انصراف</Button><Button form="school-form" type="submit" disabled={saving} variant="primary">{saving ? <><LoaderCircle className="animate-spin" size={16} />در حال ثبت</> : editing ? "ذخیره تغییرات" : "ثبت اطلاعات"}</Button></>}>
    <form id="school-form" noValidate onSubmit={submit}>
      {submitError ? <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</div> : null}
      <FormSection title="اطلاعات اصلی"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="نام مکتب" error={errors.school_name}><input className={inputClass(errors.school_name)} value={values.school_name} onChange={(event) => setValue("school_name", event.target.value)} /></Field><Field label="شماره تماس مسئول مکتب"><input dir="ltr" className="input" value={values.school_head_phone} onChange={(event) => setValue("school_head_phone", event.target.value)} /></Field><Field label="کد مکتب" error={errors.school_code}><input dir="ltr" className={inputClass(errors.school_code)} value={values.school_code} onChange={(event) => setValue("school_code", event.target.value)} /></Field><Field label="نوع مکتب" error={errors.school_type_code}><SearchableSelect value={values.school_type_code} onChange={(value) => setValue("school_type_code", value)} placeholder="انتخاب نوع مکتب" options={schoolTypeOptions} /></Field><Field label="نوع جنسیت" error={errors.gender_type_code}><SearchableSelect value={values.gender_type_code} onChange={(value) => setValue("gender_type_code", value)} placeholder="انتخاب نوع جنسیت" options={genderTypeOptions} /></Field><Field label="تشکیل مکتب" error={errors.school_formation}><input className={inputClass(errors.school_formation)} value={values.school_formation} onChange={(event) => setValue("school_formation", event.target.value)} /></Field></div></FormSection>
      <FormSection title="آمار تشکیلاتی"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><CountInput label="تعداد سرمعلم" value={values.senior_teacher_count} error={errors.senior_teacher_count} onChange={(value) => setValue("senior_teacher_count", value)} /><CountInput label="تعداد معلم ذکور" value={values.male_teacher_count} error={errors.male_teacher_count} onChange={(value) => setValue("male_teacher_count", value)} /><CountInput label="تعداد معلم اناث" value={values.female_teacher_count} error={errors.female_teacher_count} onChange={(value) => setValue("female_teacher_count", value)} /><CountInput label="تعداد معلم خدماتی ورودی" value={values.incoming_service_teacher_count} error={errors.incoming_service_teacher_count} onChange={(value) => setValue("incoming_service_teacher_count", value)} /><CountInput label="تعداد معلم خدماتی خروجی" value={values.outgoing_service_teacher_count} error={errors.outgoing_service_teacher_count} onChange={(value) => setValue("outgoing_service_teacher_count", value)} /><CountInput label="تعداد معلم رضاکار" value={values.volunteer_teacher_count} error={errors.volunteer_teacher_count} onChange={(value) => setValue("volunteer_teacher_count", value)} /><CountInput label="تعداد صنوف / شعبات فعال" value={values.active_class_section_count} error={errors.active_class_section_count} onChange={(value) => setValue("active_class_section_count", value)} /></div></FormSection>
      <FormSection title="آمار شاگردان صنف‌ها"><p className="mb-3 text-xs leading-5 text-muted">برای هر صنف می‌توانید یک یا چند شعبه ثبت کنید. تعداد حاضر و مجموع ذکور و اناث هر شعبه نمی‌تواند بیشتر از تعداد داخله باشد.</p><div className="space-y-2">{values.grade_statistics.map((grade) => <GradeAccordion key={grade.grade_number} grade={grade} errorMessages={errors.grades?.[grade.grade_number] ?? []} open={openGrade === grade.grade_number} onToggle={() => setOpenGrade((current) => current === grade.grade_number ? null : grade.grade_number)} onAdd={() => addSection(grade.grade_number)} onRemove={(clientId) => removeSection(grade.grade_number, clientId)} onUpdate={(clientId, field, value) => updateSection(grade.grade_number, clientId, field, value)} />)}</div></FormSection>
      <FormSection title="نیازمندی‌ها و تجهیزات"><div className="grid gap-4 lg:grid-cols-2"><Field label="نیازمندی‌های مکتب"><textarea className="textarea" value={values.school_needs} onChange={(event) => setValue("school_needs", event.target.value)} /></Field><Field label="تجهیزات مکتب"><textarea className="textarea" value={values.school_equipment} onChange={(event) => setValue("school_equipment", event.target.value)} /></Field></div></FormSection>
    </form>
  </AppDialog>;
}

function GradeAccordion({ grade, errorMessages, open, onToggle, onAdd, onRemove, onUpdate }: { grade: GradeFormGroup; errorMessages: string[]; open: boolean; onToggle: () => void; onAdd: () => void; onRemove: (clientId: string) => void; onUpdate: (clientId: string, field: keyof Omit<GradeSectionForm, "id" | "clientId">, value: string) => void }) {
  const totals = grade.sections.reduce((current, section) => ({ enrolled_count: current.enrolled_count + Number(section.enrolled_count || 0), present_count: current.present_count + Number(section.present_count || 0), male_count: current.male_count + Number(section.male_count || 0), female_count: current.female_count + Number(section.female_count || 0) }), { enrolled_count: 0, present_count: 0, male_count: 0, female_count: 0 });
  return <section className={`overflow-hidden rounded-lg border ${errorMessages.length ? "border-rose-300" : "border-line"}`}><div className="flex items-center justify-between gap-3 bg-slate-50/70 px-3 py-2.5"><button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-right" onClick={onToggle} aria-expanded={open}><span className="font-medium text-ink">صنف {grade.grade_number.toLocaleString("fa-AF")}</span><span className="flex items-center gap-2 text-xs text-muted">{grade.sections.length.toLocaleString("fa-AF")} شعبه<ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} /></span></button><Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={onAdd}><Plus size={15} />افزودن شعبه</Button></div>{open ? <div className="border-t border-line p-3"><div className="hidden overflow-x-auto rounded-md border border-line sm:block"><table className="w-full min-w-[42rem] text-sm"><thead className="bg-slate-50 text-muted"><tr><th className="px-2 py-2 text-right font-semibold">شعبه</th>{(["enrolled_count", "present_count", "male_count", "female_count"] as CountField[]).map((field) => <th key={field} className="px-2 py-2 text-right font-semibold">{countLabels[field]}</th>)}<th className="w-14 px-2 py-2 text-right font-semibold">عملیات</th></tr></thead><tbody className="divide-y divide-line/70">{grade.sections.map((section) => <tr key={section.clientId}><td className="p-2"><input className="input h-9" value={section.section_name} onChange={(event) => onUpdate(section.clientId, "section_name", event.target.value)} /></td>{(["enrolled_count", "present_count", "male_count", "female_count"] as CountField[]).map((field) => <td className="p-2" key={field}><input dir="ltr" inputMode="numeric" min="0" step="1" type="number" className="input h-9 min-w-20" value={section[field]} onChange={(event) => onUpdate(section.clientId, field, event.target.value)} /></td>)}<td className="p-2"><Button aria-label="حذف شعبه" title="حذف شعبه" type="button" variant="ghost" className="h-8 w-8 px-0 text-rose-700 hover:bg-rose-50" onClick={() => onRemove(section.clientId)}><Trash2 size={16} /></Button></td></tr>)}</tbody></table></div><div className="space-y-3 sm:hidden">{grade.sections.map((section) => <article key={section.clientId} className="rounded-md border border-line p-3"><div className="flex items-end gap-2"><label className="flex-1"><span className="mb-1 block text-xs text-muted">شعبه</span><input className="input h-9" value={section.section_name} onChange={(event) => onUpdate(section.clientId, "section_name", event.target.value)} /></label><Button aria-label="حذف شعبه" title="حذف شعبه" type="button" variant="ghost" className="h-9 w-9 px-0 text-rose-700" onClick={() => onRemove(section.clientId)}><Trash2 size={16} /></Button></div><div className="mt-3 grid grid-cols-2 gap-2">{(["enrolled_count", "present_count", "male_count", "female_count"] as CountField[]).map((field) => <label key={field}><span className="mb-1 block text-xs text-muted">{countLabels[field]}</span><input dir="ltr" inputMode="numeric" min="0" step="1" type="number" className="input h-9" value={section[field]} onChange={(event) => onUpdate(section.clientId, field, event.target.value)} /></label>)}</div></article>)}</div>{grade.sections.length ? <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs sm:grid-cols-4">{(["enrolled_count", "present_count", "male_count", "female_count"] as CountField[]).map((field) => <div key={field} className="rounded-md bg-slate-50 px-2.5 py-2"><span className="text-muted">مجموع {countLabels[field]}</span><strong className="mt-0.5 block text-sm text-ink">{totals[field].toLocaleString("fa-AF")}</strong></div>)}</div> : <p className="text-sm text-muted">هنوز شعبه‌ای ثبت نشده است.</p>}{errorMessages.map((message) => <p key={message} role="alert" className="mt-2 text-xs text-rose-700">{message}</p>)}</div> : null}</section>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) { return <section className="mt-6 border-t border-line pt-5 first:mt-0 first:border-t-0 first:pt-0"><h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>{children}</section>; }
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>{children}{error ? <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p> : null}</label>; }
function CountInput({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) { return <Field label={label} error={error}><input dir="ltr" inputMode="numeric" min="0" step="1" type="number" className={inputClass(error)} value={value} onChange={(event) => onChange(event.target.value)} /></Field>; }
function inputClass(error?: string) { return `input ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`; }

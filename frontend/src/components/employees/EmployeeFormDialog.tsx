import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { createEmployee, updateEmployee, type EmployeePayload } from "../../api/employees";
import type { Department, Employee } from "../../types/api";
import { educationLevelOptions, fieldMatchLabels, jobTitleLabels } from "../../lib/employeeLabels";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { Button } from "../ui/button";

type FormValues = Omit<EmployeePayload, "teaching_experience" | "grade_post" | "step"> & {
  teaching_experience: string;
  grade_post: string;
  step: string;
};

type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyValues: FormValues = {
  name: "",
  father_name: "",
  grandfather_name: "",
  school_workplace: "",
  city_district: "",
  phone_number: "",
  field_of_study: "",
  education_level: "",
  subjects_taught: "",
  job_title_code: "",
  teaching_experience: "",
  grade_post: "",
  step: "",
  successful_evaluation: "",
  field_match_code: "",
  department_ids: [],
  notes: "",
};

function employeeToValues(employee?: Employee): FormValues {
  if (!employee) return { ...emptyValues };
  return {
    name: employee.name,
    father_name: employee.father_name,
    grandfather_name: employee.grandfather_name,
    school_workplace: employee.school_workplace,
    city_district: employee.city_district,
    phone_number: employee.phone_number,
    field_of_study: employee.field_of_study,
    education_level: employee.education_level,
    subjects_taught: employee.subjects_taught,
    job_title_code: employee.job_title_code,
    teaching_experience: String(employee.teaching_experience),
    grade_post: String(employee.grade_post),
    step: String(employee.step),
    successful_evaluation: employee.successful_evaluation,
    field_match_code: employee.field_match_code,
    department_ids: employee.departments.map((department) => department.id),
    notes: employee.notes ?? "",
  };
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const required: FieldName[] = [
    "name", "father_name", "grandfather_name", "school_workplace", "city_district", "phone_number",
    "field_of_study", "education_level", "subjects_taught", "job_title_code", "successful_evaluation",
    "field_match_code",
  ];
  required.forEach((field) => {
    if (!String(values[field]).trim()) errors[field] = "این فیلد الزامی است.";
  });
  (["teaching_experience", "grade_post", "step"] as const).forEach((field) => {
    const number = Number(values[field]);
    if (!Number.isInteger(number) || number < 0) errors[field] = "عدد صحیحِ صفر یا بیشتر وارد کنید.";
  });
  return errors;
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  employee?: Employee;
  onSaved: (message: string) => void;
}

export function EmployeeFormDialog({ open, onOpenChange, departments, employee, onSaved }: EmployeeFormDialogProps) {
  const [values, setValues] = useState<FormValues>(() => employeeToValues(employee));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(employeeToValues(employee));
      setErrors({});
      setSubmitError("");
    }
  }, [employee, open]);

  const setValue = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleDepartment = (departmentId: number) => {
    setValue(
      "department_ids",
      values.department_ids.includes(departmentId)
        ? values.department_ids.filter((id) => id !== departmentId)
        : [...values.department_ids, departmentId],
    );
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload: EmployeePayload = {
      ...values,
      teaching_experience: Number(values.teaching_experience),
      grade_post: Number(values.grade_post),
      step: Number(values.step),
      notes: values.notes?.trim() || null,
    };
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (employee) {
        await updateEmployee(employee.id, payload);
        onSaved("اطلاعات کارمند به‌روزرسانی شد.");
      } else {
        await createEmployee(payload);
        onSaved("کارمند جدید با موفقیت ثبت شد.");
      }
      onOpenChange(false);
    } catch {
      setSubmitError("ثبت اطلاعات با مشکل روبه‌رو شد. لطفاً داده‌ها را بررسی کرده و دوباره کوشش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (field: FieldName) => `h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink ${errors[field] ? "border-rose-500" : "border-line"}`;
  const textAreaClass = (field: FieldName) => `min-h-24 w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-ink ${errors[field] ? "border-rose-500" : "border-line"}`;
  const fieldError = (field: FieldName) => errors[field] ? <p className="mt-1 text-xs text-rose-700">{errors[field]}</p> : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed inset-x-3 top-3 bottom-3 z-50 mx-auto flex max-w-5xl flex-col rounded-xl border border-line bg-white shadow-panel sm:inset-y-6">
          <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="text-base font-bold text-ink">{employee ? "ویرایش اطلاعات کارمند" : "افزودن کارمند"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">اطلاعات اصلی و دیپارتمنت‌های مربوطه را وارد کنید.</Dialog.Description>
            </div>
            <Dialog.Close asChild><button className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="بستن"><X size={19} /></button></Dialog.Close>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={onSubmit}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {submitError ? <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</div> : null}
              <section>
                <h2 className="mb-3 text-sm font-bold text-ink">مشخصات کارمند</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="اسم" field="name"><input className={fieldClass("name")} value={values.name} onChange={(e) => setValue("name", e.target.value)} /></Field>
                  <Field label="ولد" field="father_name"><input className={fieldClass("father_name")} value={values.father_name} onChange={(e) => setValue("father_name", e.target.value)} /></Field>
                  <Field label="ولدیت" field="grandfather_name"><input className={fieldClass("grandfather_name")} value={values.grandfather_name} onChange={(e) => setValue("grandfather_name", e.target.value)} /></Field>
                  <Field label="مکتب / محل وظیفه" field="school_workplace"><input className={fieldClass("school_workplace")} value={values.school_workplace} onChange={(e) => setValue("school_workplace", e.target.value)} /></Field>
                  <Field label="شهر / ولسوالی" field="city_district"><input className={fieldClass("city_district")} value={values.city_district} onChange={(e) => setValue("city_district", e.target.value)} /></Field>
                  <Field label="شماره تماس" field="phone_number"><input dir="ltr" className={fieldClass("phone_number")} value={values.phone_number} onChange={(e) => setValue("phone_number", e.target.value)} /></Field>
                  <Field label="رشته تحصیلی" field="field_of_study"><input className={fieldClass("field_of_study")} value={values.field_of_study} onChange={(e) => setValue("field_of_study", e.target.value)} /></Field>
                  <Field label="درجه تحصیل" field="education_level"><select className={fieldClass("education_level")} value={values.education_level} onChange={(e) => setValue("education_level", e.target.value)}><option value="">انتخاب کنید</option>{educationLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}</select></Field>
                  <Field label="عنوان وظیفه" field="job_title_code"><select className={fieldClass("job_title_code")} value={values.job_title_code} onChange={(e) => setValue("job_title_code", e.target.value)}><option value="">انتخاب کنید</option>{Object.entries(jobTitleLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></Field>
                  <Field label="سابقه تدریس" field="teaching_experience"><input type="number" min="0" className={fieldClass("teaching_experience")} value={values.teaching_experience} onChange={(e) => setValue("teaching_experience", e.target.value)} /></Field>
                  <Field label="بست" field="grade_post"><input type="number" min="0" className={fieldClass("grade_post")} value={values.grade_post} onChange={(e) => setValue("grade_post", e.target.value)} /></Field>
                  <Field label="قدم" field="step"><input type="number" min="0" className={fieldClass("step")} value={values.step} onChange={(e) => setValue("step", e.target.value)} /></Field>
                  <Field label="مطابق رشته" field="field_match_code"><select className={fieldClass("field_match_code")} value={values.field_match_code} onChange={(e) => setValue("field_match_code", e.target.value)}><option value="">انتخاب کنید</option>{Object.entries(fieldMatchLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></Field>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <Field label="مضامین که تدریس می‌کند" field="subjects_taught"><textarea className={textAreaClass("subjects_taught")} value={values.subjects_taught} onChange={(e) => setValue("subjects_taught", e.target.value)} /></Field>
                  <Field label="ارزیابی موفق" field="successful_evaluation"><textarea className={textAreaClass("successful_evaluation")} value={values.successful_evaluation} onChange={(e) => setValue("successful_evaluation", e.target.value)} /></Field>
                </div>
              </section>

              <section className="mt-6 border-t border-line pt-5">
                <h2 className="text-sm font-bold text-ink">دیپارتمنت‌های مربوطه</h2>
                <p className="mt-1 text-xs leading-5 text-muted">برای عنوان‌های غیرمعلم، دیپارتمنت تعلیم و تربیه توسط سیستم اضافه و حفظ می‌شود.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {departments.map((department) => <label key={department.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={values.department_ids.includes(department.id)} onChange={() => toggleDepartment(department.id)} />{getDepartmentLabel(department.code, department.display_name)}</label>)}
                </div>
              </section>

              <section className="mt-6 border-t border-line pt-5">
                <Field label="ملاحظات" field="notes"><textarea className={textAreaClass("notes")} value={values.notes ?? ""} onChange={(e) => setValue("notes", e.target.value)} /></Field>
              </section>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
              <Dialog.Close asChild><Button disabled={isSubmitting} variant="secondary">انصراف</Button></Dialog.Close>
              <Button type="submit" disabled={isSubmitting} variant="primary">{isSubmitting ? <><LoaderCircle className="animate-spin" size={16} />در حال ثبت</> : "ثبت اطلاعات"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  function Field({ label, field, children }: { label: string; field: FieldName; children: React.ReactNode }) {
    return <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>{children}{fieldError(field)}</label>;
  }
}

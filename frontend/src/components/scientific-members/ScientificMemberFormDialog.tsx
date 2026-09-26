import { useEffect, useState } from "react";

import { createScientificMember, updateScientificMember, type ScientificMemberPayload } from "../../api/scientificMembers";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import type { Department, ScientificMember } from "../../types/api";
import { AppDialog } from "../shared/AppDialog";
import { SearchableSelect, type SelectOption } from "../shared/SearchableSelect";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: ScientificMember;
  departments: Department[];
  onSaved: (message: string) => void;
}

const blank = { name: "", surname: "", father_name: "", phone_number: "", academic_rank: "", department_id: "", notes: "" };

export function ScientificMemberFormDialog({ open, onOpenChange, member, departments, onSaved }: Props) {
  const [values, setValues] = useState(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const departmentOptions: SelectOption[] = departments.map((department) => ({ value: String(department.id), label: getDepartmentLabel(department.code, department.display_name) }));

  useEffect(() => {
    if (!open) return;
    setValues(member ? { name: member.name, surname: member.surname, father_name: member.father_name, phone_number: member.phone_number, academic_rank: member.academic_rank, department_id: String(member.department_id), notes: member.notes ?? "" } : blank);
    setError("");
  }, [member, open]);

  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.name.trim() || !values.surname.trim() || !values.father_name.trim() || !values.phone_number.trim() || !values.academic_rank.trim() || !values.department_id) {
      setError("تمام فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    setSaving(true);
    setError("");
    const payload: ScientificMemberPayload = { ...values, name: values.name.trim(), surname: values.surname.trim(), father_name: values.father_name.trim(), phone_number: values.phone_number.trim(), academic_rank: values.academic_rank.trim(), department_id: Number(values.department_id), notes: values.notes.trim() || null };
    try {
      if (member) {
        await updateScientificMember(member.id, payload);
        onSaved("اطلاعات عضو علمی به‌روزرسانی شد.");
      } else {
        await createScientificMember(payload);
        onSaved("عضو علمی جدید با موفقیت ثبت شد.");
      }
      onOpenChange(false);
    } catch {
      setError("ثبت اطلاعات با مشکل روبه‌رو شد. لطفاً دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md" title={member ? "ویرایش عضو علمی" : "افزودن عضو علمی"} description="مشخصات و دیپارتمنت مربوطه را وارد کنید." footer={<><Button variant="secondary" disabled={saving} onClick={() => onOpenChange(false)}>انصراف</Button><Button form="scientific-member-form" type="submit" variant="primary" disabled={saving}>{saving ? "در حال ثبت" : "ثبت اطلاعات"}</Button></>}>
      <form id="scientific-member-form" noValidate onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم"><input className="input" value={values.name} onChange={(event) => set("name", event.target.value)} /></Field>
          <Field label="تخلص"><input className="input" value={values.surname} onChange={(event) => set("surname", event.target.value)} /></Field>
          <Field label="ولد"><input className="input" value={values.father_name} onChange={(event) => set("father_name", event.target.value)} /></Field>
          <Field label="شماره تماس"><input dir="ltr" className="input" value={values.phone_number} onChange={(event) => set("phone_number", event.target.value)} /></Field>
          <Field label="رتبه علمی"><input className="input" value={values.academic_rank} onChange={(event) => set("academic_rank", event.target.value)} /></Field>
          <Field label="دیپارتمنت"><SearchableSelect value={values.department_id} options={departmentOptions} onChange={(value) => set("department_id", value)} placeholder="انتخاب دیپارتمنت" searchPlaceholder="جستجوی دیپارتمنت" /></Field>
        </div>
        <div className="mt-5 border-t border-line pt-5"><Field label="ملاحظات"><textarea className="textarea" value={values.notes} onChange={(event) => set("notes", event.target.value)} /></Field></div>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      </form>
    </AppDialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>{children}</label>;
}

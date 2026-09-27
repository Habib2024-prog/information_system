import { useEffect, useState, type FormEvent } from "react";
import { createUser, updateUser } from "../../api/users";
import { ApiError } from "../../api/client";
import { roleOptions } from "../../lib/authLabels";
import type { ManagedUser, RoleCode, UserPayload } from "../../types/auth";
import { AppDialog } from "../shared/AppDialog";
import { SearchableSelect } from "../shared/SearchableSelect";
import { Button } from "../ui/button";

interface Props { open: boolean; user?: ManagedUser; onOpenChange: (open: boolean) => void; onSaved: (user: ManagedUser) => void; }
const empty = { username: "", full_name: "", role_code: "user" as RoleCode, is_active: true };

export function UserFormDialog({ open, user, onOpenChange, onSaved }: Props) {
  const [values, setValues] = useState<UserPayload>(empty);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPassword(""); setErrors({}); setError("");
    if (open) setValues(user ? { username: user.username, full_name: user.full_name, role_code: user.role_code, is_active: user.is_active } : empty);
  }, [open, user]);
  const set = <K extends keyof UserPayload>(key: K, value: UserPayload[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const next: Record<string, string> = {};
    if (!values.username.trim()) next.username = "نام کاربری را وارد کنید.";
    if (!values.full_name.trim()) next.full_name = "نام کامل را وارد کنید.";
    if (!user && password.length < 8) next.password = "رمز عبور باید حداقل ۸ حرف داشته باشد.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true); setError("");
    const payload = { ...values, username: values.username.trim(), full_name: values.full_name.trim() };
    try {
      const saved = user ? await updateUser(user.id, payload) : await createUser({ ...payload, password });
      setPassword(""); onOpenChange(false); onSaved(saved);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "ثبت اطلاعات کاربر ممکن نشد. دوباره تلاش کنید."); }
    finally { setPassword(""); setSaving(false); }
  };
  return <AppDialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }} title={user ? "ویرایش کاربر" : "افزودن کاربر"} description="اطلاعات کاربر و سطح دسترسی او را تعیین کنید." size="md" footer={<><Button disabled={saving} onClick={() => onOpenChange(false)}>انصراف</Button><Button variant="primary" form="user-form" type="submit" disabled={saving}>{saving ? "در حال ثبت" : user ? "ذخیره تغییرات" : "ثبت کاربر"}</Button></>}>
    <form id="user-form" noValidate onSubmit={submit} className="space-y-5">
      <section className="space-y-4" aria-labelledby="user-information"><h2 id="user-information" className="text-sm font-semibold">اطلاعات کاربر</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium">نام کاربری</span><input className="input" name="username" dir="auto" autoComplete="off" disabled={saving} value={values.username} onChange={(event) => set("username", event.target.value)} aria-invalid={Boolean(errors.username)} />{errors.username ? <FieldError message={errors.username} /> : null}</label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium">نام کامل</span><input className="input" disabled={saving} value={values.full_name} onChange={(event) => set("full_name", event.target.value)} aria-invalid={Boolean(errors.full_name)} />{errors.full_name ? <FieldError message={errors.full_name} /> : null}</label>
          {!user ? <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">رمز عبور</span><input className="input" name="new-password" type="password" dir="ltr" autoComplete="new-password" disabled={saving} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} /><p className="mt-1 text-xs text-muted">حداقل ۸ حرف</p>{errors.password ? <FieldError message={errors.password} /> : null}</label> : null}
        </div>
      </section>
      <section className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div><span className="mb-1.5 block text-sm font-medium">نقش</span><SearchableSelect ariaLabel="نقش" disabled={saving} value={values.role_code} options={roleOptions} onChange={(role) => { if (role === "admin" || role === "user") set("role_code", role); }} placeholder="انتخاب نقش" /></div>
        <div><span className="mb-1.5 block text-sm font-medium">وضعیت</span><SearchableSelect ariaLabel="وضعیت" disabled={saving} value={values.is_active ? "active" : "inactive"} options={[{ value: "active", label: "فعال" }, { value: "inactive", label: "غیرفعال" }]} onChange={(value) => set("is_active", value === "active")} placeholder="انتخاب وضعیت" /></div>
      </section>
      {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-[hsl(var(--danger))]">{error}</p> : null}
    </form>
  </AppDialog>;
}

function FieldError({ message }: { message: string }) { return <p role="alert" className="mt-1 text-xs text-[hsl(var(--danger))]">{message}</p>; }

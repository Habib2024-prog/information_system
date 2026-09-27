import { useEffect, useState, type FormEvent } from "react";
import { changeUserPassword } from "../../api/users";
import { ApiError } from "../../api/client";
import type { ManagedUser } from "../../types/auth";
import { AppDialog } from "../shared/AppDialog";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

export function PasswordDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  useEffect(() => { setPassword(""); setConfirmation(""); setError(""); }, [user]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || saving) return;
    if (password.length < 8) { setError("رمز عبور باید حداقل ۸ حرف داشته باشد."); return; }
    if (password !== confirmation) { setError("رمز جدید و تکرار آن یکسان نیستند."); return; }
    setSaving(true); setError("");
    try { await changeUserPassword(user.id, password); showToast("رمز عبور با موفقیت تغییر کرد."); onClose(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "تغییر رمز ممکن نشد. دوباره تلاش کنید."); }
    finally { setPassword(""); setConfirmation(""); setSaving(false); }
  };
  return <AppDialog open={Boolean(user)} onOpenChange={(open) => { if (!open && !saving) onClose(); }} size="sm" title="تغییر رمز عبور" description={user?.full_name ?? "رمز جدید را وارد کنید."} footer={<><Button disabled={saving} onClick={onClose}>انصراف</Button><Button variant="primary" disabled={saving} type="submit" form="password-form">{saving ? "در حال ذخیره" : "ذخیره رمز جدید"}</Button></>}>
    <form id="password-form" noValidate onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-1.5 block text-sm font-medium">رمز جدید</span><input className="input" dir="ltr" type="password" autoComplete="new-password" disabled={saving} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">تکرار رمز جدید</span><input className="input" dir="ltr" type="password" autoComplete="new-password" disabled={saving} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <p className="text-xs text-muted">رمز جدید باید حداقل ۸ حرف داشته باشد.</p>
      {error ? <p role="alert" className="text-sm text-[hsl(var(--danger))]">{error}</p> : null}
    </form>
  </AppDialog>;
}

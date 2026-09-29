import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";

import { ApiError } from "../../api/client";
import { removeUserProfileImage, uploadUserProfileImage } from "../../api/users";
import type { CurrentUser } from "../../types/auth";
import { AppDialog } from "./AppDialog";
import { UserAvatar } from "./UserAvatar";
import { Button } from "../ui/button";

const maximumBytes = 5 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfilePhotoDialog({ user, open, onOpenChange, onSaved }: {
  user: CurrentUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: CurrentUser) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!open) {
      setFile(null); setError("");
      setPreview((current) => { if (current) URL.revokeObjectURL(current); return null; });
    }
  }, [open]);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!candidate) return;
    if (!acceptedTypes.has(candidate.type) || candidate.size > maximumBytes) {
      setFile(null); setError("فقط تصویرهای JPG، PNG یا WebP تا حجم ۵ مگابایت پذیرفته می‌شوند."); return;
    }
    setError(""); setFile(candidate);
    setPreview((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(candidate); });
  };
  const upload = async () => {
    if (!file || saving) return;
    setSaving(true); setError("");
    try { await onSaved(await uploadUserProfileImage(user.id, file)); setFile(null); onOpenChange(false); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "بارگذاری تصویر ممکن نشد. دوباره تلاش کنید."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (saving || !user.profile_image_url) return;
    setSaving(true); setError("");
    try { await onSaved(await removeUserProfileImage(user.id)); onOpenChange(false); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "حذف تصویر ممکن نشد. دوباره تلاش کنید."); }
    finally { setSaving(false); }
  };

  return <AppDialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }} size="sm" title="تصویر نمایه" description={user.full_name} footer={<><Button disabled={saving} onClick={() => onOpenChange(false)}>انصراف</Button>{user.profile_image_url ? <Button variant="danger" disabled={saving} onClick={() => void remove()}><Trash2 size={16} />حذف تصویر</Button> : null}<Button variant="primary" disabled={!file || saving} onClick={() => void upload()}>{saving ? "در حال بارگذاری" : "ذخیرهٔ تصویر"}</Button></>}>
    <div className="space-y-5 text-center">
      <UserAvatar user={user} size="lg" imageUrl={preview ?? undefined} className="mx-auto" />
      <label className="surface-card flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent/40 hover:bg-accent-soft/35">
        <ImagePlus size={18} className="text-accent" />انتخاب تصویر
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={saving} onChange={chooseFile} />
      </label>
      <p className="text-xs leading-6 text-muted">JPG، PNG یا WebP؛ حداکثر ۵ مگابایت</p>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-right text-sm text-danger">{error}</p> : null}
    </div>
  </AppDialog>;
}

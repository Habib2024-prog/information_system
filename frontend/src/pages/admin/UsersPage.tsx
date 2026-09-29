import { usePaginatedList } from "../../hooks/usePaginatedList";
import { DEFAULT_PAGE_SIZE, getTotalPages } from "../../lib/pagination";
import { Camera, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { ApiError } from "../../api/client";
import { deleteUser, getUsers, updateUser } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { PasswordDialog } from "../../components/admin/PasswordDialog";
import { UserFormDialog } from "../../components/admin/UserFormDialog";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { DataTableCards, DataTableShell, TableColumns } from "../../components/shared/DataTableShell";
import { PageHeader } from "../../components/shared/PageHeader";
import { PaginationControls } from "../../components/shared/PaginationControls";
import { ProfilePhotoDialog } from "../../components/shared/ProfilePhotoDialog";
import { UserAvatar } from "../../components/shared/UserAvatar";
import { EmptyState, ErrorState, LoadingState } from "../../components/shared/states";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { getAccountStatusLabel, getRoleLabel } from "../../lib/authLabels";
import type { ManagedUser } from "../../types/auth";

const pageSize = DEFAULT_PAGE_SIZE;
export function UsersPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<ManagedUser | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [profileUser, setProfileUser] = useState<ManagedUser | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fetchPage = useCallback(() => getUsers(page, pageSize), [page, reload]);
  const { data, loading, error, retry } = usePaginatedList({
    fetchPage, page, pageSize, onPageChange: setPage, errorMessage: "دریافت کاربران ممکن نشد.",
  });

  const saved = async (record: ManagedUser) => {
    showToast(editing ? "اطلاعات کاربر به‌روزرسانی شد." : "کاربر با موفقیت ثبت شد.");
    if (record.id === currentUser?.id) await refreshUser();
    setReload((value) => value + 1);
  };
  const toggle = async (record: ManagedUser) => {
    setBusyId(record.id);
    try {
      await updateUser(record.id, { username: record.username, full_name: record.full_name, role_code: record.role_code, is_active: !record.is_active });
      showToast(record.is_active ? "کاربر غیرفعال شد." : "کاربر فعال شد.");
      if (record.id === currentUser?.id) await refreshUser();
      setReload((value) => value + 1);
    } catch (cause) { showToast(cause instanceof ApiError ? cause.message : "تغییر وضعیت ممکن نشد.", "error"); }
    finally { setBusyId(null); }
  };
  const remove = async (record: ManagedUser) => {
    setBusyId(record.id);
    try {
      await deleteUser(record.id); showToast("کاربر حذف شد.");
      if (record.id === currentUser?.id) await refreshUser();
      setReload((value) => value + 1);
    } catch (cause) { showToast(cause instanceof ApiError ? cause.message : "حذف کاربر ممکن نشد.", "error"); }
    finally { setBusyId(null); }
  };
  const actions = (record: ManagedUser) => <div className="flex shrink-0 gap-1">
    <Button variant="ghost" className="size-8 px-0" title="مدیریت تصویر نمایه" aria-label="مدیریت تصویر نمایه" disabled={busyId !== null} onClick={() => setProfileUser(record)}><Camera size={16} /></Button>
    <Button variant="ghost" className="size-8 px-0" title="ویرایش" aria-label="ویرایش" disabled={busyId !== null} onClick={() => { setEditing(record); setFormOpen(true); }}><Pencil size={16} /></Button>
    <Button variant="ghost" className="size-8 px-0" title="تغییر رمز" aria-label="تغییر رمز" disabled={busyId !== null} onClick={() => setPasswordUser(record)}><KeyRound size={16} /></Button>
    <ConfirmDialog title={record.is_active ? "غیرفعال‌کردن کاربر" : "فعال‌کردن کاربر"} description={`آیا از تغییر وضعیت «${record.full_name}» مطمئن هستید؟`} confirmLabel="تأیید" onConfirm={() => void toggle(record)} trigger={<Button variant="ghost" className="size-8 px-0" disabled={busyId !== null} title={record.is_active ? "غیرفعال‌کردن" : "فعال‌کردن"} aria-label={record.is_active ? "غیرفعال‌کردن" : "فعال‌کردن"}><Power size={16} /></Button>} />
    <ConfirmDialog title="حذف کاربر" description={`آیا از حذف «${record.full_name}» مطمئن هستید؟`} confirmLabel="حذف" onConfirm={() => void remove(record)} trigger={<Button variant="ghost" className="size-8 px-0 text-[hsl(var(--danger))]" disabled={busyId !== null} title="حذف" aria-label="حذف"><Trash2 size={16} /></Button>} />
  </div>;
  const status = (record: ManagedUser) => <span className={`inline-flex rounded-md px-2 py-0.5 text-xs ${record.is_active ? "bg-emerald-50 text-[hsl(var(--success))]" : "bg-slate-100 text-muted"}`}>{getAccountStatusLabel(record.is_active)}</span>;
  return <div className="space-y-5 sm:space-y-6">
    <PageHeader title="کاربران" description="مدیریت حساب‌ها، نقش‌ها و دسترسی کاربران" actions={<Button variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus size={16} />افزودن کاربر</Button>} />
    {loading ? <LoadingState title="در حال دریافت کاربران" description="فهرست حساب‌ها در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت کاربران" description={error} onRetry={retry} /> : !data?.items.length ? <EmptyState title="کاربری یافت نشد" description="یک حساب جدید ایجاد کنید." /> : <>
      <DataTableShell bounded responsive><table className="data-table w-full table-fixed"><TableColumns widths={[6, 20, 28, 12, 12, 22]} /><thead><tr>{["شماره", "نام کاربری", "نام کامل", "نقش", "وضعیت", "عملیات"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((record) => <tr key={record.id}><td>{record.id.toLocaleString("fa-AF")}</td><td><bdi className="block truncate" title={record.username}>{record.username}</bdi></td><td className="font-medium"><div className="flex min-w-0 items-center gap-2"><UserAvatar user={record} /><span className="min-w-0 truncate" title={record.full_name}>{record.full_name}</span></div></td><td>{getRoleLabel(record.role_code)}</td><td>{status(record)}</td><td>{actions(record)}</td></tr>)}</tbody></table></DataTableShell>
      <DataTableCards>{data.items.map((record) => <article className="surface-card p-4" key={record.id}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><UserAvatar user={record} /><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{record.full_name}</h2><bdi className="mt-1 block truncate text-sm text-muted">{record.username}</bdi></div></div>{status(record)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3"><span className="text-sm text-muted">{getRoleLabel(record.role_code)}</span>{actions(record)}</div></article>)}</DataTableCards>
    </>}
    {!loading && !error && data ? <PaginationControls page={page} totalPages={getTotalPages(data.total, pageSize)} total={data.total} onPageChange={setPage} /> : null}
    <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} onSaved={(record) => void saved(record)} />
    <PasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} />
    {profileUser ? <ProfilePhotoDialog user={profileUser} open onOpenChange={(open) => { if (!open) setProfileUser(null); }} onSaved={async (record) => { if (record.id === currentUser?.id) await refreshUser(); setReload((value) => value + 1); }} /> : null}
  </div>;
}

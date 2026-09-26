import { ClipboardList, Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getDepartments } from "../api/departments";
import { deleteScientificMember, emptyScientificMemberFilters, exportScientificMembers, getScientificMembers, type ScientificMemberFilters } from "../api/scientificMembers";
import { ObservationHistoryDialog } from "../components/scientific-members/ObservationHistoryDialog";
import { ScientificMemberDetailsDialog } from "../components/scientific-members/ScientificMemberDetailsDialog";
import { ScientificMemberFormDialog } from "../components/scientific-members/ScientificMemberFormDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { DataTableShell } from "../components/shared/DataTableShell";
import { FilterToolbar } from "../components/shared/FilterToolbar";
import { PageHeader } from "../components/shared/PageHeader";
import { PaginationControls } from "../components/shared/PaginationControls";
import { SearchInput } from "../components/shared/SearchInput";
import { SearchableSelect } from "../components/shared/SearchableSelect";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { getDepartmentLabel } from "../lib/departmentLabels";
import type { Department, PaginatedResponse, ScientificMember } from "../types/api";

const pageSize = 20;

export function ScientificMembersPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ScientificMemberFilters>({ ...emptyScientificMemberFilters });
  const [data, setData] = useState<PaginatedResponse<ScientificMember> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScientificMember | undefined>();
  const [details, setDetails] = useState<ScientificMember | null>(null);
  const [history, setHistory] = useState<ScientificMember | null>(null);
  const [reload, setReload] = useState(0);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const result = await getScientificMembers({ ...filters, page, page_size: pageSize, sort_by: "id", sort_order: "asc" }); setData(result); if (!result.items.length && result.total && page > 1) setPage((current) => current - 1); } catch { setError("دریافت اعضای علمی با مشکل روبه‌رو شد."); } finally { setLoading(false); } }, [filters, page, reload]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { getDepartments().then(setDepartments).catch(() => showToast("دریافت دیپارتمنت‌ها با مشکل روبه‌رو شد.", "error")); }, [showToast]);
  const update = (key: keyof ScientificMemberFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const afterSave = (message: string) => { showToast(message); setPage(1); setReload((current) => current + 1); };
  const remove = async (member: ScientificMember) => { try { await deleteScientificMember(member.id); showToast("عضو علمی حذف شد."); setReload((current) => current + 1); } catch { showToast("حذف عضو علمی با مشکل روبه‌رو شد.", "error"); } };
  const exportFile = async () => { setExporting(true); try { await exportScientificMembers(filters); showToast("فایل اکسل با فیلترهای فعلی آماده دانلود شد."); } catch { showToast("صدور فایل اکسل با مشکل روبه‌رو شد.", "error"); } finally { setExporting(false); } };
  const items = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  return <div className="space-y-5 sm:space-y-6"><PageHeader title="اعضای علمی" description="مدیریت اعضای علمی و مشاهده سوابق مشاهدات" actions={<><Button disabled={exporting} variant="secondary" onClick={() => void exportFile()}><Download size={16} />{exporting ? "در حال آماده‌سازی" : "دانلود اکسل"}</Button><Button variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus size={16} />افزودن عضو علمی</Button></>} /><Filters filters={filters} departments={departments} onChange={update} onClear={() => { setFilters({ ...emptyScientificMemberFilters }); setPage(1); }} />{loading ? <LoadingState title="در حال دریافت اعضای علمی" description="فهرست اعضای علمی در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت اطلاعات" description={error} onRetry={() => void load()} /> : items.length === 0 ? <EmptyState title="عضو علمی یافت نشد" description="فیلترها را تغییر دهید یا عضو علمی جدیدی ثبت کنید." /> : <><MembersTable items={items} onDetails={setDetails} onEdit={(member) => { setEditing(member); setFormOpen(true); }} onHistory={setHistory} onDelete={(member) => void remove(member)} /><PaginationControls page={page} total={data?.total ?? 0} totalPages={pages} pageSize={pageSize} onPageChange={setPage} /></>}<ScientificMemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} departments={departments} onSaved={afterSave} /><ScientificMemberDetailsDialog member={details} onOpenChange={(open) => { if (!open) setDetails(null); }} /><ObservationHistoryDialog member={history} onOpenChange={(open) => { if (!open) setHistory(null); }} /></div>;
}

function Filters({ filters, departments, onChange, onClear }: { filters: ScientificMemberFilters; departments: Department[]; onChange: (key: keyof ScientificMemberFilters, value: string) => void; onClear: () => void }) {
  const departmentOptions = [{ value: "", label: "همه دیپارتمنت‌ها" }, ...departments.map((department) => ({ value: String(department.id), label: getDepartmentLabel(department.code, department.display_name) }))];
  const advanced = <><input className="input" placeholder="اسم" value={filters.name} onChange={(event) => onChange("name", event.target.value)} /><input className="input" placeholder="تخلص" value={filters.surname} onChange={(event) => onChange("surname", event.target.value)} /><input className="input" placeholder="ولد" value={filters.father_name} onChange={(event) => onChange("father_name", event.target.value)} /><input className="input" placeholder="رتبه علمی" value={filters.academic_rank} onChange={(event) => onChange("academic_rank", event.target.value)} /></>;
  return <FilterToolbar onClear={onClear} advanced={advanced}><SearchInput className="col-span-2" value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="جستجوی عضو علمی" /><SearchableSelect value={filters.department_id} options={departmentOptions} onChange={(value) => onChange("department_id", value)} placeholder="دیپارتمنت" /></FilterToolbar>;
}

function MembersTable({ items, onDetails, onEdit, onHistory, onDelete }: { items: ScientificMember[]; onDetails: (member: ScientificMember) => void; onEdit: (member: ScientificMember) => void; onHistory: (member: ScientificMember) => void; onDelete: (member: ScientificMember) => void }) { return <><DataTableShell className="hidden lg:block"><table className="data-table"><thead><tr>{["شماره", "اسم", "تخلص", "ولد", "رتبه علمی", "دیپارتمنت", "مشاهدات", "عملیات"].map((title) => <th key={title}>{title}</th>)}</tr></thead><tbody>{items.map((member) => <tr key={member.id}><td className="text-muted">{member.id.toLocaleString("fa-AF")}</td><td className="font-medium text-ink">{member.name}</td><td>{member.surname}</td><td>{member.father_name}</td><td>{member.academic_rank}</td><td>{getDepartmentLabel(member.department.code, member.department.display_name)}</td><td><Button className="h-8 px-2.5" variant="ghost" onClick={() => onHistory(member)}><ClipboardList size={16} />مشاهدات {member.observation_count.toLocaleString("fa-AF")}</Button></td><td><Actions member={member} onDetails={onDetails} onEdit={onEdit} onDelete={onDelete} /></td></tr>)}</tbody></table></DataTableShell><div className="space-y-3 lg:hidden">{items.map((member) => <article key={member.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted">شمارهٔ ثبت: {member.id.toLocaleString("fa-AF")}</p><h2 className="mt-1 truncate text-sm font-semibold text-ink">{member.name} {member.surname}</h2><p className="mt-1 text-sm text-muted">ولد: {member.father_name}</p></div><Actions member={member} onDetails={onDetails} onEdit={onEdit} onDelete={onDelete} /></div><div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm"><span>{getDepartmentLabel(member.department.code, member.department.display_name)}</span><Button className="h-8 px-2.5" variant="ghost" onClick={() => onHistory(member)}><ClipboardList size={16} />مشاهدات {member.observation_count.toLocaleString("fa-AF")}</Button></div></article>)}</div></>; }
function Actions({ member, onDetails, onEdit, onDelete }: { member: ScientificMember; onDetails: (member: ScientificMember) => void; onEdit: (member: ScientificMember) => void; onDelete: (member: ScientificMember) => void }) { return <div className="flex gap-1"><IconAction title="مشاهده جزئیات" onClick={() => onDetails(member)} icon={<Eye size={16} />} /><IconAction title="ویرایش" onClick={() => onEdit(member)} icon={<Pencil size={16} />} /><ConfirmDialog title="حذف عضو علمی" description={`آیا از حذف «${member.name}» مطمئن هستید؟`} confirmLabel="حذف" onConfirm={() => onDelete(member)} trigger={<IconAction title="حذف" icon={<Trash2 size={16} />} danger />} /></div>; }
function IconAction({ title, onClick, icon, danger = false }: { title: string; onClick?: () => void; icon: React.ReactNode; danger?: boolean }) { return <Button variant="ghost" className={`h-8 w-8 px-0 ${danger ? "text-rose-700 hover:bg-rose-50" : ""}`} title={title} aria-label={title} onClick={onClick}>{icon}</Button>; }

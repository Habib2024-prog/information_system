import * as Dialog from "@radix-ui/react-dialog";
import { Download, Eye, FilePlus2, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getEmployee, getEmployees } from "../api/employees";
import {
  deleteAmirObservation,
  deleteTeacherObservation,
  emptyObservationFilters,
  exportAmirObservations,
  exportTeacherObservations,
  getAmirObservation,
  getAmirObservations,
  getTeacherObservation,
  getTeacherObservations,
  type AmirObservationDetail,
  type ObservationFilters,
  type ObservationListItem,
  type TeacherObservationDetail,
} from "../api/observations";
import { getScientificMembers } from "../api/scientificMembers";
import { ObservationFormDialog, type EditableObservation, type ObservationKind } from "../components/departments/ObservationFormDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { DataTableShell } from "../components/shared/DataTableShell";
import { FilterToolbar } from "../components/shared/FilterToolbar";
import { PageHeader } from "../components/shared/PageHeader";
import { PaginationControls } from "../components/shared/PaginationControls";
import { SearchInput } from "../components/shared/SearchInput";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { getJobTitleLabel } from "../lib/employeeLabels";
import { formatAmirCompetency, formatTeacherCompetency, getFinalResultLabel } from "../lib/observationLabels";
import type { Employee, ScientificMember } from "../types/api";

type ObservationTab = "teacher" | "amir";
type DetailState = { item: ObservationListItem; kind: ObservationTab; data: TeacherObservationDetail | AmirObservationDetail } | null;

const pageSize = 20;

export function ObservationsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ObservationTab>("teacher");
  const [filters, setFilters] = useState<ObservationFilters>(emptyObservationFilters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ObservationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<ScientificMember[]>([]);
  const [detail, setDetail] = useState<DetailState>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formKind, setFormKind] = useState<ObservationKind | null>(null);
  const [editing, setEditing] = useState<EditableObservation | null>(null);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeChoices, setEmployeeChoices] = useState<Employee[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = { ...filters, page, page_size: pageSize };
      const response = tab === "teacher" ? await getTeacherObservations(query) : await getAmirObservations(query);
      setItems(response.items); setTotal(response.total);
    } catch { setError("دریافت فهرست مشاهدات با مشکل روبه‌رو شد."); }
    finally { setLoading(false); }
  }, [filters, page, tab]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { getScientificMembers({ page: 1, page_size: 100, sort_by: "id", sort_order: "asc" }).then((response) => setMembers(response.items)).catch(() => setMembers([])); }, []);
  useEffect(() => {
    if (!employeePickerOpen) return;
    setPickerLoading(true);
    getEmployees({ search: employeeQuery, page: 1, page_size: 20, sort_by: "name", sort_order: "asc" })
      .then((response) => setEmployeeChoices(response.items)).catch(() => setEmployeeChoices([])).finally(() => setPickerLoading(false));
  }, [employeePickerOpen, employeeQuery]);

  function switchTab(next: ObservationTab) { setTab(next); setFilters(emptyObservationFilters); setPage(1); }
  function setFilter<K extends keyof ObservationFilters>(key: K, value: ObservationFilters[K]) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); }
  async function openDetail(item: ObservationListItem) {
    try {
      const data = tab === "teacher" ? await getTeacherObservation(item.employee_id, item.id) : await getAmirObservation(item.employee_id, item.id);
      setDetail({ item, kind: tab, data });
    } catch { showToast("دریافت جزئیات مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  async function edit(item: ObservationListItem) {
    try {
      const [employee, observation] = await Promise.all([
        getEmployee(item.employee_id),
        tab === "teacher" ? getTeacherObservation(item.employee_id, item.id) : getAmirObservation(item.employee_id, item.id),
      ]);
      setSelectedEmployee(employee); setFormKind(tab); setEditing(observation);
    } catch { showToast("دریافت اطلاعات مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  async function remove(item: ObservationListItem) {
    try {
      if (tab === "teacher") await deleteTeacherObservation(item.employee_id, item.id);
      else await deleteAmirObservation(item.employee_id, item.id);
      showToast("مشاهده حذف شد."); void load();
    } catch { showToast("حذف مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  function chooseEmployee(employee: Employee) {
    if (employee.job_title_code === "teacher") { setSelectedEmployee(employee); setFormKind("teacher"); setEditing(null); }
    else if (employee.job_title_code === "amir" || employee.job_title_code === "senior_teacher") { setSelectedEmployee(employee); setFormKind("amir"); setEditing(null); }
    else showToast("برای مدیر، فرم مشاهده تعریف نشده است.", "error");
    setEmployeePickerOpen(false);
  }
  async function download() {
    setExporting(true);
    try { if (tab === "teacher") await exportTeacherObservations(filters); else await exportAmirObservations(filters); }
    catch { showToast("دانلود فایل اکسل با مشکل روبه‌رو شد.", "error"); }
    finally { setExporting(false); }
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const typeLabel = tab === "teacher" ? "معلمین" : "آمر و سرمعلم";

  return <main className="space-y-5" dir="rtl">
    <PageHeader title="مشاهدات" description="مدیریت و مشاهده سوابق ارزیابی معلمین، آمران و سرمعلم‌ها" actions={<><Button variant="secondary" disabled={exporting} onClick={() => void download()}>{exporting ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}دانلود اکسل</Button><Button variant="primary" onClick={() => setEmployeePickerOpen(true)}><FilePlus2 size={16} />ثبت مشاهده</Button></>} />
    <div className="inline-flex rounded-xl border border-line bg-white p-1 shadow-soft" role="tablist" aria-label="نوع مشاهده">
      <Tab active={tab === "teacher"} onClick={() => switchTab("teacher")}>مشاهدات معلمین</Tab>
      <Tab active={tab === "amir"} onClick={() => switchTab("amir")}>مشاهدات آمر و سرمعلم</Tab>
    </div>
    <FilterToolbar onClear={() => { setFilters(emptyObservationFilters); setPage(1); }}>
      <SearchInput value={filters.search} onChange={(event) => setFilter("search", event.target.value)} placeholder="جستجوی کارمند یا مضمون" />
      <input aria-label="تاریخ از" className="input col-span-2 sm:col-span-1" type="date" value={filters.observation_date_from} onChange={(event) => setFilter("observation_date_from", event.target.value)} />
      <input aria-label="تاریخ تا" className="input col-span-2 sm:col-span-1" type="date" value={filters.observation_date_to} onChange={(event) => setFilter("observation_date_to", event.target.value)} />
      <FilterSelect value={filters.observer_scientific_member_id} onChange={(value) => setFilter("observer_scientific_member_id", value)} ariaLabel="مشاهده‌کننده"><option value="">همه مشاهده‌کنندگان</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} {member.surname}</option>)}</FilterSelect>
      <input aria-label="شماره کارمند" inputMode="numeric" className="input" placeholder="شماره کارمند" value={filters.employee_id} onChange={(event) => setFilter("employee_id", event.target.value)} />
      <input aria-label="مضمون" className="input" placeholder="مضمون" value={filters.subject} onChange={(event) => setFilter("subject", event.target.value)} />
      <FilterSelect value={filters.final_result_code} onChange={(value) => setFilter("final_result_code", value)} ariaLabel="نتیجه نهایی"><option value="">همه نتیجه‌ها</option>{(tab === "teacher" ? ["needs_improvement", "has_capability", "mastery"] : ["basic_capability", "applied_capability", "mastery"]).map((code) => <option key={code} value={code}>{getFinalResultLabel(code, tab === "teacher" ? "teacher" : "amir_senior_teacher")}</option>)}</FilterSelect>
      {tab === "amir" ? <FilterSelect value={filters.employee_job_title_code} onChange={(value) => setFilter("employee_job_title_code", value)} ariaLabel="عنوان وظیفه"><option value="">همه عنوان‌ها</option>{["amir", "senior_teacher"].map((code) => <option key={code} value={code}>{getJobTitleLabel(code)}</option>)}</FilterSelect> : null}
    </FilterToolbar>
    {loading ? <LoadingState title="در حال دریافت مشاهدات" description="لطفاً چند لحظه صبر کنید." /> : error ? <ErrorState title="دریافت اطلاعات ممکن نشد" description={error} /> : items.length === 0 ? <EmptyState title={`مشاهده‌ای برای ${typeLabel} یافت نشد`} description="فیلترها را تغییر دهید یا مشاهده جدیدی ثبت کنید." /> : <><ObservationTable items={items} tab={tab} onDetail={openDetail} onEdit={edit} onDelete={(item) => void remove(item)} /><PaginationControls page={page} total={total} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} /></>}
    <EmployeePicker open={employeePickerOpen} query={employeeQuery} loading={pickerLoading} employees={employeeChoices} onQueryChange={setEmployeeQuery} onOpenChange={setEmployeePickerOpen} onSelect={chooseEmployee} />
    <ObservationFormDialog employee={selectedEmployee} kind={formKind} initialObservation={editing} onOpenChange={(open) => { if (!open) { setSelectedEmployee(null); setFormKind(null); setEditing(null); } }} onSaved={() => { showToast(editing ? "مشاهده ویرایش شد." : "مشاهده ثبت شد."); setSelectedEmployee(null); setFormKind(null); setEditing(null); void load(); }} />
    <ObservationDetailDialog detail={detail} onOpenChange={(open) => { if (!open) setDetail(null); }} />
  </main>;
}

function Tab({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) { return <button role="tab" aria-selected={active} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? "bg-accent text-white shadow-soft" : "text-muted hover:bg-slate-50 hover:text-ink"}`}>{children}</button>; }
function FilterSelect({ children, value, onChange, ariaLabel }: { children: React.ReactNode; value: string; onChange: (value: string) => void; ariaLabel: string }) { return <select aria-label={ariaLabel} className="input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>; }

function ObservationTable({ items, tab, onDetail, onEdit, onDelete }: { items: ObservationListItem[]; tab: ObservationTab; onDetail: (item: ObservationListItem) => void; onEdit: (item: ObservationListItem) => void; onDelete: (item: ObservationListItem) => void }) {
  return <DataTableShell><table className="data-table min-w-[900px]"><thead><tr><th>شماره</th><th>تاریخ مشاهده</th><th>اسم کارمند</th><th>ولد</th>{tab === "amir" ? <th>عنوان وظیفه</th> : null}<th>مضمون</th><th>مشاهده‌کننده</th><th>مجموع نمره</th><th>نتیجه نهایی</th><th>عملیات</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id.toLocaleString("fa-AF")}</td><td dir="ltr">{item.observation_date}</td><td>{item.employee_name}</td><td>{item.employee_father_name}</td>{tab === "amir" ? <td>{getJobTitleLabel(item.employee_job_title_code)}</td> : null}<td>{item.subject}</td><td>{item.observer.name} {item.observer.surname}</td><td dir="ltr">{Number(item.total_score).toFixed(2)}</td><td><span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{getFinalResultLabel(item.final_result_code, tab === "teacher" ? "teacher" : "amir_senior_teacher")}</span></td><td><div className="flex items-center gap-1"><Action label="مشاهده جزئیات" onClick={() => void onDetail(item)}><Eye size={16} /></Action><Action label="ویرایش" onClick={() => void onEdit(item)}><Pencil size={16} /></Action><ConfirmDialog title="حذف مشاهده" description="این مشاهده به‌صورت نرم حذف می‌شود." confirmLabel="حذف" onConfirm={() => onDelete(item)} trigger={<Action label="حذف"><Trash2 size={16} /></Action>} /></div></td></tr>)}</tbody></table></DataTableShell>;
}
function Action({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className="rounded-md p-2 text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{children}</button>; }

function EmployeePicker({ open, query, loading, employees, onQueryChange, onOpenChange, onSelect }: { open: boolean; query: string; loading: boolean; employees: Employee[]; onQueryChange: (value: string) => void; onOpenChange: (open: boolean) => void; onSelect: (employee: Employee) => void }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]" /><Dialog.Content className="fixed right-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-white p-5 shadow-panel"><div className="flex items-start justify-between"><div><Dialog.Title className="text-base font-bold text-ink">انتخاب کارمند</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">نوع فرم بر مبنای عنوان وظیفه تعیین می‌شود.</Dialog.Description></div><Dialog.Close className="rounded-md p-1.5 text-muted hover:bg-slate-100" aria-label="بستن"><X size={18} /></Dialog.Close></div><div className="mt-4"><SearchInput value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجوی اسم یا ولد" /></div><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{loading ? <LoadingState title="در حال جستجو" description="" /> : employees.map((employee) => <button key={employee.id} type="button" onClick={() => onSelect(employee)} className="w-full rounded-lg border border-line p-3 text-right transition hover:border-accent/30 hover:bg-accent-soft"><span className="font-medium text-ink">{employee.name}</span><span className="mr-2 text-sm text-muted">{employee.father_name} · {getJobTitleLabel(employee.job_title_code)}</span></button>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function ObservationDetailDialog({ detail, onOpenChange }: { detail: DetailState; onOpenChange: (open: boolean) => void }) {
  const teacher = detail?.kind === "teacher";
  const data = detail?.data;
  const competencies = !data ? [] : teacher ? [["دانش مضمونی", formatTeacherCompetency(Number((data as TeacherObservationDetail).subject_knowledge_score))], ["پلان درسی", formatTeacherCompetency(Number((data as TeacherObservationDetail).lesson_plan_score))], ["مدیریت صنف", formatTeacherCompetency(Number((data as TeacherObservationDetail).classroom_management_score))], ["ارزیابی", formatTeacherCompetency(Number((data as TeacherObservationDetail).assessment_score))], ["آموزش‌های مسلکی", formatTeacherCompetency(Number((data as TeacherObservationDetail).professional_learning_score))], ["ارتباط با اجتماع", formatTeacherCompetency(Number((data as TeacherObservationDetail).community_engagement_score))]] : [["مسوولیت پذیری", formatAmirCompetency(Number((data as AmirObservationDetail).responsibility_score))], ["رهبری مسلکی", formatAmirCompetency(Number((data as AmirObservationDetail).professional_leadership_score))], ["روابط با جامعه", formatAmirCompetency(Number((data as AmirObservationDetail).community_relations_score))], ["انکشاف مسلکی", formatAmirCompetency(Number((data as AmirObservationDetail).professional_development_score))]];
  return <Dialog.Root open={Boolean(detail)} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100vh-1rem)] overflow-y-auto rounded-t-2xl border border-line bg-white p-5 shadow-panel sm:inset-x-auto sm:right-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-w-3xl sm:translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"><div className="flex items-start justify-between border-b border-line pb-4"><div><Dialog.Title className="text-base font-bold text-ink">جزئیات مشاهده</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">اطلاعات کامل ارزیابی و نمره‌ها</Dialog.Description></div><Dialog.Close className="rounded-md p-1.5 text-muted hover:bg-slate-100" aria-label="بستن"><X size={18} /></Dialog.Close></div>{detail && data ? <div className="space-y-5 pt-5"><section className="grid gap-3 rounded-xl border border-line bg-slate-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><Detail label="کارمند" value={detail.item.employee_name} /><Detail label="ولد" value={detail.item.employee_father_name} /><Detail label="محل وظیفه" value={detail.item.employee_school_workplace} /><Detail label="عنوان وظیفه" value={getJobTitleLabel(detail.item.employee_job_title_code)} /><Detail label="تاریخ مشاهده" value={data.observation_date} ltr /><Detail label="صنف مشاهده شده" value={data.observed_class} /><Detail label="مضمون" value={data.subject} /><Detail label="مشاهده‌کننده" value={`${data.observer.name} ${data.observer.surname}`} /><Detail label="مجموع نمره" value={Number(data.total_score).toFixed(2)} ltr /><Detail label="نتیجه نهایی" value={getFinalResultLabel(data.final_result_code, teacher ? "teacher" : "amir_senior_teacher")} /></section><section><h2 className="text-sm font-bold text-ink">قابلیت‌ها</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{competencies.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section><section className="grid gap-3 sm:grid-cols-3"><Detail label="نکات قوت" value={data.strengths ?? "—"} /><Detail label="نکات قابل اصلاح" value={data.improvements ?? "—"} /><Detail label="ملاحظات" value={data.notes ?? "—"} /></section></div> : null}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) { return <div className="rounded-lg border border-line bg-white p-3"><dt className="text-xs text-muted">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 break-words text-sm text-ink">{value}</dd></div>; }

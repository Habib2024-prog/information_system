import { Download, Eye, FilePlus2, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { Children, isValidElement, useCallback, useEffect, useState } from "react";

import { getEmployee, getEmployees } from "../api/employees";
import { getDepartments } from "../api/departments";
import { deleteAmirObservation, deleteTeacherObservation, emptyObservationFilters, exportAmirObservations, exportTeacherObservations, getAmirObservation, getAmirObservations, getTeacherObservation, getTeacherObservations, type AmirObservationDetail, type ObservationFilters, type ObservationListItem, type TeacherObservationDetail } from "../api/observations";
import { getScientificMembers } from "../api/scientificMembers";
import { ObservationFormDialog, type EditableObservation, type ObservationKind } from "../components/departments/ObservationFormDialog";
import { ObservationDetailDialog } from "../components/observations/ObservationDetailDialog";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { DataTableShell } from "../components/shared/DataTableShell";
import { DateRangeFilter, isValidDateRange } from "../components/shared/DateRangeFilter";
import { FilterToolbar } from "../components/shared/FilterToolbar";
import { PageHeader } from "../components/shared/PageHeader";
import { PaginationControls } from "../components/shared/PaginationControls";
import { SearchInput } from "../components/shared/SearchInput";
import { SearchableSelect } from "../components/shared/SearchableSelect";
import { AppDialog } from "../components/shared/AppDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { getDepartmentLabel } from "../lib/departmentLabels";
import { getJobTitleLabel, jobTitleLabels } from "../lib/employeeLabels";
import { formatApiDate } from "../lib/date";
import { getFinalResultLabel } from "../lib/observationLabels";
import type { Department, Employee, ScientificMember } from "../types/api";

type ObservationTab = "teacher" | "amir";
type DetailState = { item: ObservationListItem; kind: ObservationTab; data: TeacherObservationDetail | AmirObservationDetail } | null;
interface EmployeePickerFilters {
  name: string;
  father_name: string;
  department_id: string;
  job_title_code: string;
}

const emptyEmployeePickerFilters: EmployeePickerFilters = {
  name: "",
  father_name: "",
  department_id: "",
  job_title_code: "",
};
const pageSize = 20;

export function ObservationsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ObservationTab>("teacher");
  const [filters, setFilters] = useState<ObservationFilters>({ ...emptyObservationFilters });
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
  const [employeePickerFilters, setEmployeePickerFilters] = useState<EmployeePickerFilters>({ ...emptyEmployeePickerFilters });
  const [employeePickerPage, setEmployeePickerPage] = useState(1);
  const [employeeChoices, setEmployeeChoices] = useState<Employee[]>([]);
  const [employeeChoicesTotal, setEmployeeChoicesTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exporting, setExporting] = useState(false);

  const dateRangeValid = isValidDateRange(filters.observation_date_from, filters.observation_date_to);
  const load = useCallback(async () => {
    if (!isValidDateRange(filters.observation_date_from, filters.observation_date_to)) return;
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
  useEffect(() => { getDepartments().then(setDepartments).catch(() => setDepartments([])); }, []);
  useEffect(() => {
    if (!employeePickerOpen) return;
    setPickerLoading(true);
    getEmployees({ ...employeePickerFilters, page: employeePickerPage, page_size: pageSize, sort_by: "name", sort_order: "asc" }).then((response) => { setEmployeeChoices(response.items); setEmployeeChoicesTotal(response.total); }).catch(() => { setEmployeeChoices([]); setEmployeeChoicesTotal(0); }).finally(() => setPickerLoading(false));
  }, [employeePickerOpen, employeePickerFilters, employeePickerPage]);

  const setFilter = <K extends keyof ObservationFilters>(key: K, value: ObservationFilters[K]) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const switchTab = (next: ObservationTab) => { setTab(next); setFilters({ ...emptyObservationFilters }); setPage(1); };
  const resultType = tab === "teacher" ? "teacher" : "amir_senior_teacher" as const;

  async function openDetail(item: ObservationListItem) {
    try {
      const data = tab === "teacher" ? await getTeacherObservation(item.employee_id, item.id) : await getAmirObservation(item.employee_id, item.id);
      setDetail({ item, kind: tab, data });
    } catch { showToast("دریافت جزئیات مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  async function edit(item: ObservationListItem) {
    try {
      const [employee, observation] = await Promise.all([getEmployee(item.employee_id), tab === "teacher" ? getTeacherObservation(item.employee_id, item.id) : getAmirObservation(item.employee_id, item.id)]);
      setSelectedEmployee(employee); setFormKind(tab); setEditing(observation);
    } catch { showToast("دریافت اطلاعات مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  async function remove(item: ObservationListItem) {
    try {
      if (tab === "teacher") await deleteTeacherObservation(item.employee_id, item.id); else await deleteAmirObservation(item.employee_id, item.id);
      showToast("مشاهده حذف شد."); void load();
    } catch { showToast("حذف مشاهده با مشکل روبه‌رو شد.", "error"); }
  }
  function chooseEmployee(employee: Employee) {
    if (employee.job_title_code === "teacher") { setSelectedEmployee(employee); setFormKind("teacher"); setEditing(null); }
    else if (employee.job_title_code === "amir" || employee.job_title_code === "senior_teacher") { setSelectedEmployee(employee); setFormKind("amir"); setEditing(null); }
    else showToast("برای مدیر، فرم مشاهده تعریف نشده است.", "error");
    setEmployeePickerOpen(false);
  }
  function openEmployeePicker() {
    setEmployeePickerFilters({ ...emptyEmployeePickerFilters });
    setEmployeePickerPage(1);
    setEmployeePickerOpen(true);
  }
  async function download() {
    if (!dateRangeValid) return;
    setExporting(true);
    try { if (tab === "teacher") await exportTeacherObservations(filters); else await exportAmirObservations(filters); }
    catch { showToast("دانلود فایل اکسل با مشکل روبه‌رو شد.", "error"); }
    finally { setExporting(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const typeLabel = tab === "teacher" ? "معلمین" : "آمر و سرمعلم";
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
  const activeAdvancedCount = [
    filters.observation_date_from,
    filters.observation_date_to,
    filters.employee_id,
    filters.subject,
    tab === "amir" ? filters.employee_job_title_code : "",
  ].filter(Boolean).length;
  return <main className="space-y-5" dir="rtl">
    <PageHeader title="مشاهدات" description="مدیریت و مشاهده سوابق ارزیابی معلمین، آمران و سرمعلم‌ها" actions={<><Button variant="secondary" disabled={exporting || !dateRangeValid} onClick={() => void download()}>{exporting ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}دانلود اکسل</Button><Button variant="primary" onClick={openEmployeePicker}><FilePlus2 size={16} />ثبت مشاهده</Button></>} />
    <div className="inline-flex rounded-xl border border-line/80 bg-white/80 p-1 shadow-soft backdrop-blur" role="tablist" aria-label="نوع مشاهده"><Tab active={tab === "teacher"} onClick={() => switchTab("teacher")}>مشاهدات معلمین</Tab><Tab active={tab === "amir"} onClick={() => switchTab("amir")}>مشاهدات آمر و سرمعلم</Tab></div>
    <FilterToolbar
      hasActiveFilters={hasActiveFilters}
      activeAdvancedCount={activeAdvancedCount}
      onClear={() => { setFilters({ ...emptyObservationFilters }); setPage(1); }}
      advanced={<>
        <DateRangeFilter className="sm:col-span-2" from={filters.observation_date_from} to={filters.observation_date_to} onFromChange={(value) => setFilter("observation_date_from", value)} onToChange={(value) => setFilter("observation_date_to", value)} />
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">شماره کارمند</span><input inputMode="numeric" className="input" value={filters.employee_id} onChange={(event) => setFilter("employee_id", event.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">مضمون</span><input className="input" value={filters.subject} onChange={(event) => setFilter("subject", event.target.value)} /></label>
        {tab === "amir" ? <FilterSelect value={filters.employee_job_title_code} onChange={(value) => setFilter("employee_job_title_code", value)} label="عنوان وظیفه"><option value="">همه عنوان‌ها</option>{["amir", "senior_teacher"].map((code) => <option key={code} value={code}>{getJobTitleLabel(code)}</option>)}</FilterSelect> : null}
      </>}
    >
      <SearchInput className="sm:col-span-2 lg:col-span-1" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} placeholder="جستجوی کارمند یا مضمون" />
      <FilterSelect className="lg:col-span-2" value={filters.observer_scientific_member_id} onChange={(value) => setFilter("observer_scientific_member_id", value)} label="مشاهده‌کننده"><option value="">همه مشاهده‌کنندگان</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} {member.surname}</option>)}</FilterSelect>
      <FilterSelect value={filters.final_result_code} onChange={(value) => setFilter("final_result_code", value)} label="نتیجه"><option value="">همه نتیجه‌ها</option>{(tab === "teacher" ? ["needs_improvement", "has_capability", "mastery"] : ["basic_capability", "applied_capability", "mastery"]).map((code) => <option key={code} value={code}>{getFinalResultLabel(code, resultType)}</option>)}</FilterSelect>
    </FilterToolbar>
    {!dateRangeValid ? null : loading ? <LoadingState title="در حال دریافت مشاهدات" description="لطفاً چند لحظه صبر کنید." /> : error ? <ErrorState title="دریافت اطلاعات ممکن نشد" description={error} onRetry={() => void load()} /> : items.length === 0 ? <EmptyState title={`مشاهده‌ای برای ${typeLabel} یافت نشد`} description="فیلترها را تغییر دهید یا مشاهده جدیدی ثبت کنید." /> : <><ObservationTable items={items} tab={tab} onDetail={openDetail} onEdit={edit} onDelete={(item) => void remove(item)} /><PaginationControls page={page} total={total} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} /></>}
    <EmployeePicker open={employeePickerOpen} filters={employeePickerFilters} departments={departments} page={employeePickerPage} total={employeeChoicesTotal} loading={pickerLoading} employees={employeeChoices} onFiltersChange={(nextFilters) => { setEmployeePickerFilters(nextFilters); setEmployeePickerPage(1); }} onPageChange={setEmployeePickerPage} onOpenChange={setEmployeePickerOpen} onSelect={chooseEmployee} />
    <ObservationFormDialog employee={selectedEmployee} kind={formKind} initialObservation={editing} onOpenChange={(open) => { if (!open) { setSelectedEmployee(null); setFormKind(null); setEditing(null); } }} onSaved={() => { showToast(editing ? "مشاهده ویرایش شد." : "مشاهده ثبت شد."); setSelectedEmployee(null); setFormKind(null); setEditing(null); void load(); }} />
    <ObservationDetailDialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }} kind={detail?.kind === "teacher" ? "teacher" : "amir_senior_teacher"} identity={detail ? { employeeName: detail.item.employee_name, fatherName: detail.item.employee_father_name, workplace: detail.item.employee_school_workplace, jobTitleCode: detail.item.employee_job_title_code } : null} data={detail?.data ?? null} />
  </main>;
}

function Tab({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) { return <button role="tab" aria-selected={active} onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${active ? "bg-accent text-white shadow-soft" : "text-muted hover:bg-slate-50 hover:text-ink"}`}>{children}</button>; }
function optionText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(optionText).join("");
  if (isValidElement<{ children?: React.ReactNode }>(value)) return optionText(value.props.children);
  return "";
}

function FilterSelect({ children, value, onChange, label, className }: { children: React.ReactNode; value: string; onChange: (value: string) => void; label: string; className?: string }) {
  const options = Children.toArray(children).flatMap((child) => isValidElement<{ value?: string | number; children?: React.ReactNode }>(child) ? [{ value: String(child.props.value ?? ""), label: optionText(child.props.children) }] : []);
  return <SearchableSelect className={className} value={value} onChange={onChange} placeholder={label} options={options} />;
}

function ObservationTable({ items, tab, onDetail, onEdit, onDelete }: { items: ObservationListItem[]; tab: ObservationTab; onDetail: (item: ObservationListItem) => void; onEdit: (item: ObservationListItem) => void; onDelete: (item: ObservationListItem) => void }) {
  const resultType = tab === "teacher" ? "teacher" : "amir_senior_teacher";

  return <>
    <DataTableShell className="hidden overflow-hidden xl:block">
      <table className="data-table w-full table-fixed">
        <colgroup>
          <col className="w-[6.75rem]" />
          <col className="w-[17%]" />
          {tab === "amir" ? <col className="w-[6.5rem]" /> : null}
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[5.25rem]" />
          <col className="w-[8.25rem]" />
          <col className="w-[6.75rem]" />
        </colgroup>
        <thead>
          <tr>
            <th>تاریخ</th>
            <th>کارمند</th>
            {tab === "amir" ? <th>عنوان وظیفه</th> : null}
            <th>مضمون</th>
            <th>مشاهده‌کننده</th>
            <th>مجموع</th>
            <th>نتیجه</th>
            <th className="text-center">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => <tr key={item.id}>
            <td dir="ltr" className="whitespace-nowrap tabular-nums">{formatApiDate(item.observation_date)}</td>
            <td className="truncate font-medium text-ink" title={item.employee_name}>{item.employee_name}</td>
            {tab === "amir" ? <td className="truncate" title={getJobTitleLabel(item.employee_job_title_code)}>{getJobTitleLabel(item.employee_job_title_code)}</td> : null}
            <td className="truncate" title={item.subject}>{item.subject}</td>
            <td className="truncate" title={item.observer.name + " " + item.observer.surname}>{item.observer.name} {item.observer.surname}</td>
            <td dir="ltr" className="whitespace-nowrap tabular-nums">{Number(item.total_score).toFixed(2)}</td>
            <td><ResultBadge result={getFinalResultLabel(item.final_result_code, resultType)} /></td>
            <td>
              <div className="flex items-center justify-center gap-0.5">
                <Action label="مشاهده جزئیات" onClick={() => void onDetail(item)}><Eye size={16} /></Action>
                <Action label="ویرایش" onClick={() => void onEdit(item)}><Pencil size={16} /></Action>
                <ConfirmDialog title="حذف مشاهده" description="آیا از حذف این مشاهده مطمئن هستید؟" confirmLabel="حذف" onConfirm={() => onDelete(item)} trigger={<Action label="حذف" danger><Trash2 size={16} /></Action>} />
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </DataTableShell>
    <div className="space-y-3 xl:hidden">
      {items.map((item) => <article key={item.id} className="surface-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-xs tabular-nums text-muted" dir="ltr">{formatApiDate(item.observation_date)}</p>
            <h2 className="mt-1 truncate text-sm font-semibold text-ink">{item.employee_name}</h2>
            <p className="mt-1 truncate text-sm text-muted">{item.subject} · {item.observer.name} {item.observer.surname}</p>
          </div>
          <ResultBadge result={getFinalResultLabel(item.final_result_code, resultType)} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span dir="ltr" className="whitespace-nowrap text-sm tabular-nums text-muted">{Number(item.total_score).toFixed(2)}</span>
          <div className="flex gap-0.5">
            <Action label="مشاهده جزئیات" onClick={() => void onDetail(item)}><Eye size={16} /></Action>
            <Action label="ویرایش" onClick={() => void onEdit(item)}><Pencil size={16} /></Action>
            <ConfirmDialog title="حذف مشاهده" description="آیا از حذف این مشاهده مطمئن هستید؟" confirmLabel="حذف" onConfirm={() => onDelete(item)} trigger={<Action label="حذف" danger><Trash2 size={16} /></Action>} />
          </div>
        </div>
      </article>)}
    </div>
  </>;
}
function ResultBadge({ result }: { result: string }) { return <span className="inline-flex max-w-full truncate whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{result}</span>; }
function Action({ children, label, onClick, danger = false }: { children: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className={`rounded-md p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${danger ? "text-rose-700 hover:bg-rose-50" : "text-muted hover:bg-slate-100 hover:text-ink"}`}>{children}</button>; }

function EmployeePicker({ open, filters, departments, page, total, loading, employees, onFiltersChange, onPageChange, onOpenChange, onSelect }: {
  open: boolean;
  filters: EmployeePickerFilters;
  departments: Department[];
  page: number;
  total: number;
  loading: boolean;
  employees: Employee[];
  onFiltersChange: (filters: EmployeePickerFilters) => void;
  onPageChange: (page: number) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (employee: Employee) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");
  const setFilter = <K extends keyof EmployeePickerFilters>(key: K, value: EmployeePickerFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const departmentOptions = departments.map((department) => ({ value: String(department.id), label: getDepartmentLabel(department.code, department.display_name) }));

  return <AppDialog open={open} onOpenChange={onOpenChange} size="lg" title="انتخاب کارمند" description="کارمند را با نام، ولد، دیپارتمنت یا عنوان وظیفه پیدا و انتخاب کنید." footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>انصراف</Button>}>
    <section className="border-b border-line/70 pb-4" aria-label="فیلتر کارمندان">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">فیلتر کارمندان</p>
        {hasActiveFilters ? <Button className="h-8 px-2 text-xs" variant="ghost" onClick={() => onFiltersChange({ ...emptyEmployeePickerFilters })}>پاک‌کردن فیلترها</Button> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">نام</span><input className="input" value={filters.name} onChange={(event) => setFilter("name", event.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">ولد</span><input className="input" value={filters.father_name} onChange={(event) => setFilter("father_name", event.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">دیپارتمنت</span><SearchableSelect value={filters.department_id} onChange={(value) => setFilter("department_id", value)} placeholder="همه دیپارتمنت‌ها" options={[{ value: "", label: "همه دیپارتمنت‌ها" }, ...departmentOptions]} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-muted">عنوان وظیفه</span><SearchableSelect value={filters.job_title_code} onChange={(value) => setFilter("job_title_code", value)} placeholder="همه عنوان‌های وظیفه" options={[{ value: "", label: "همه عنوان‌های وظیفه" }, ...Object.entries(jobTitleLabels).map(([value, label]) => ({ value, label }))]} /></label>
      </div>
    </section>
    <div className="mt-4">
      <p className="mb-2 text-sm text-muted">{total.toLocaleString("fa-AF")} کارمند یافت شد</p>
      <div className="divide-y divide-line/70">
        {loading ? <LoadingState title="در حال دریافت کارمندان" description="" /> : employees.length === 0 ? <EmptyState title="کارمندی یافت نشد" description="فیلترها را تغییر دهید." /> : employees.map((employee) => {
          const departmentNames = employee.departments.map((department) => getDepartmentLabel(department.code, department.display_name)).join("، ");
          return <button key={employee.id} type="button" onClick={() => onSelect(employee)} className="w-full px-3 py-3 text-right transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30">
            <span className="block font-medium text-ink">{employee.name}</span>
            <span className="mt-1 block text-sm text-muted">ولد: {employee.father_name}</span>
            <span className="mt-1 block truncate text-xs text-muted">{departmentNames || "بدون دیپارتمنت"} · {getJobTitleLabel(employee.job_title_code)}</span>
          </button>;
        })}
      </div>
      <div className="mt-3"><PaginationControls page={page} total={total} totalPages={totalPages} onPageChange={onPageChange} /></div>
    </div>
  </AppDialog>;
}

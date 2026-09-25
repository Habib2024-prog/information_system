import { useCallback, useEffect, useState } from "react";
import { Building2, Download, UsersRound } from "lucide-react";

import { exportDepartmentEmployees, getDepartments } from "../api/departments";
import { emptyEmployeeFilters, getEmployees, type EmployeeFilters } from "../api/employees";
import { DepartmentEmployeeTable } from "../components/departments/DepartmentEmployeeTable";
import { ObservationFormDialog, type ObservationKind } from "../components/departments/ObservationFormDialog";
import { EmployeeDetailsDialog } from "../components/employees/EmployeeDetailsDialog";
import { EmployeeFilters as EmployeeFiltersPanel } from "../components/employees/EmployeeFilters";
import { PageHeader } from "../components/shared/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { getDepartmentLabel } from "../lib/departmentLabels";
import type { Department, Employee, PaginatedResponse } from "../types/api";

const defaultPageSize = 20;

interface ObservationTarget {
  employee: Employee;
  kind: ObservationKind;
}

export function DepartmentsPage() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [filters, setFilters] = useState<EmployeeFilters>({ ...emptyEmployeeFilters });
  const [employees, setEmployees] = useState<PaginatedResponse<Employee> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState("");
  const [employeesError, setEmployeesError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [observationTarget, setObservationTarget] = useState<ObservationTarget | null>(null);

  const loadDepartments = useCallback(async () => {
    setIsDepartmentsLoading(true);
    setDepartmentsError("");
    try {
      setDepartments(await getDepartments());
    } catch {
      setDepartmentsError("دریافت دیپارتمنت‌ها با مشکل روبه‌رو شد.");
    } finally {
      setIsDepartmentsLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!selectedDepartment) return;
    setIsEmployeesLoading(true);
    setEmployeesError("");
    try {
      const result = await getEmployees({ ...filters, department_id: String(selectedDepartment.id), page, page_size: pageSize, sort_by: "id", sort_order: "asc" });
      setEmployees(result);
      if (result.items.length === 0 && result.total > 0 && page > 1) setPage((current) => current - 1);
    } catch {
      setEmployeesError("دریافت کارمندان این دیپارتمنت با مشکل روبه‌رو شد.");
    } finally {
      setIsEmployeesLoading(false);
    }
  }, [filters, page, pageSize, selectedDepartment]);

  useEffect(() => { void loadDepartments(); }, [loadDepartments]);
  useEffect(() => { if (selectedDepartment) void loadEmployees(); }, [loadEmployees, selectedDepartment]);

  const selectDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setEmployees(null);
    setEmployeesError("");
    setIsEmployeesLoading(true);
    setPage(1);
  };

  const updateFilters = (nextFilters: EmployeeFilters) => {
    setFilters({ ...nextFilters, department_id: "" });
    setPage(1);
  };

  const exportEmployees = async () => {
    if (!selectedDepartment) return;
    setIsExporting(true);
    try {
      await exportDepartmentEmployees(selectedDepartment.id, filters);
      showToast("فایل اکسل با فیلترهای فعلی آماده دانلود شد.");
    } catch {
      showToast("صدور فایل اکسل با مشکل روبه‌رو شد.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const startObservation = (employee: Employee) => {
    const kind = employee.job_title_code === "teacher" ? "teacher" : employee.job_title_code === "amir" || employee.job_title_code === "senior_teacher" ? "amir" : null;
    if (kind) setObservationTarget({ employee, kind });
  };

  const employeeItems = employees?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((employees?.total ?? 0) / pageSize));
  const canSelectDepartment = !isDepartmentsLoading && !departmentsError && departments.length > 0;

  return <div className="space-y-5 sm:space-y-6">
    <PageHeader title="دیپارتمنت‌ها" description="مدیریت و مشاهده کارمندان مربوط به هر دیپارتمنت" />
    {isDepartmentsLoading ? <LoadingState title="در حال دریافت دیپارتمنت‌ها" description="فهرست دیپارتمنت‌ها در حال بارگذاری است." /> : departmentsError ? <RetryPanel title="خطا در دریافت دیپارتمنت‌ها" description={departmentsError} onRetry={loadDepartments} /> : departments.length === 0 ? <EmptyState title="دیپارتمنتی یافت نشد" description="در حال حاضر دیپارتمنت فعالی برای نمایش وجود ندارد." /> : <DepartmentSelector departments={departments} selectedDepartment={selectedDepartment} onSelect={selectDepartment} />}
    {!selectedDepartment && canSelectDepartment ? <EmptyState title="یک دیپارتمنت را انتخاب کنید" description="برای مشاهدهٔ فهرست کارمندان، یکی از دیپارتمنت‌ها را انتخاب کنید." /> : null}
    {selectedDepartment ? <section className="space-y-4"><DepartmentSummary department={selectedDepartment} employeeCount={employees?.total} isLoading={isEmployeesLoading} isExporting={isExporting} onExport={exportEmployees} /><EmployeeFiltersPanel compact filters={filters} departments={departments} includeDepartmentFilter={false} onChange={updateFilters} onClear={() => updateFilters({ ...emptyEmployeeFilters })} />{isEmployeesLoading ? <LoadingState title="در حال دریافت کارمندان" description="فهرست کارمندان این دیپارتمنت در حال بارگذاری است." /> : employeesError ? <RetryPanel title="خطا در دریافت اطلاعات" description={employeesError} onRetry={loadEmployees} /> : employeeItems.length === 0 ? <EmptyState title="در این دیپارتمنت کارمندی یافت نشد" description="فیلترها را تغییر دهید یا دیپارتمنت دیگری را انتخاب کنید." /> : <><DepartmentEmployeeTable employees={employeeItems} onView={setDetailsEmployee} onObserve={startObservation} /><Pagination page={page} pageSize={pageSize} totalPages={totalPages} total={employees?.total ?? 0} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} /></>}</section> : null}
    <EmployeeDetailsDialog employee={detailsEmployee} onOpenChange={(open) => { if (!open) setDetailsEmployee(null); }} />
    <ObservationFormDialog employee={observationTarget?.employee ?? null} kind={observationTarget?.kind ?? null} onOpenChange={(open) => { if (!open) setObservationTarget(null); }} onSaved={() => showToast("مشاهده با موفقیت ثبت شد.")} />
  </div>;
}

function DepartmentSelector({ departments, selectedDepartment, onSelect }: { departments: Department[]; selectedDepartment: Department | null; onSelect: (department: Department) => void }) {
  return <section aria-label="انتخاب دیپارتمنت" className="rounded-xl border border-line bg-white p-3 shadow-soft"><div className="mb-3 flex items-center gap-2 px-1"><Building2 className="text-accent" size={18} /><h2 className="text-sm font-bold text-ink">انتخاب دیپارتمنت</h2></div><div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-5">{departments.map((department) => <button key={department.id} className={`motion-safe-transition flex min-w-44 items-center gap-2 rounded-lg border px-3 py-2.5 text-right text-sm hover:border-accent/40 hover:bg-slate-50 md:min-w-0 ${selectedDepartment?.id === department.id ? "border-accent bg-blue-50 text-accent" : "border-line bg-white text-ink"}`} onClick={() => onSelect(department)} aria-pressed={selectedDepartment?.id === department.id}><UsersRound size={16} className="shrink-0" /><span className="truncate font-medium">{getDepartmentLabel(department.code, department.display_name)}</span></button>)}</div></section>;
}

function DepartmentSummary({ department, employeeCount, isLoading, isExporting, onExport }: { department: Department; employeeCount: number | undefined; isLoading: boolean; isExporting: boolean; onExport: () => void }) {
  return <header className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-muted">دیپارتمنت انتخاب‌شده</p><h2 className="mt-1 text-lg font-bold text-ink">{getDepartmentLabel(department.code, department.display_name)}</h2><p className="mt-1 text-sm text-muted">{isLoading ? "در حال دریافت تعداد کارمندان" : employeeCount === undefined ? "تعداد کارمندان در دسترس نیست" : `${employeeCount.toLocaleString("fa-AF")} کارمند`}</p></div><Button disabled={isExporting} variant="secondary" onClick={() => void onExport()}>{isExporting ? "در حال آماده‌سازی" : <><Download size={17} />دانلود اکسل</>}</Button></header>;
}

function RetryPanel({ title, description, onRetry }: { title: string; description: string; onRetry: () => void | Promise<void> }) {
  return <div className="space-y-3"><ErrorState title={title} description={description} /><Button onClick={() => void onRetry()}>کوشش دوباره</Button></div>;
}

function Pagination({ page, pageSize, totalPages, total, onPageChange, onPageSizeChange }: { page: number; pageSize: number; totalPages: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  if (!total) return null;
  return <div className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="text-muted">صفحهٔ {page.toLocaleString("fa-AF")} از {totalPages.toLocaleString("fa-AF")}</div><div className="flex items-center gap-2"><label className="flex items-center gap-2 text-muted">تعداد در هر صفحه<select className="h-9 rounded-lg border border-line bg-white px-2 text-ink" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size.toLocaleString("fa-AF")}</option>)}</select></label><Button className="h-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>قبلی</Button><Button className="h-9" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>بعدی</Button></div></div>;
}

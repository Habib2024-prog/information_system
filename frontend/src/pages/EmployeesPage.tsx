import { useCallback, useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";

import { deleteEmployee, emptyEmployeeFilters, exportEmployees, getEmployees, type EmployeeFilters, type EmployeeSortField } from "../api/employees";
import { getDepartments } from "../api/departments";
import { EmployeeDetailsDialog } from "../components/employees/EmployeeDetailsDialog";
import { EmployeeFilters as EmployeeFiltersPanel } from "../components/employees/EmployeeFilters";
import { EmployeeFormDialog } from "../components/employees/EmployeeFormDialog";
import { EmployeeTable } from "../components/employees/EmployeeTable";
import { PageHeader } from "../components/shared/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import type { Department, Employee, PaginatedResponse } from "../types/api";

const defaultPageSize = 20;

export function EmployeesPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<EmployeeFilters>({ ...emptyEmployeeFilters });
  const [data, setData] = useState<PaginatedResponse<Employee> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortBy, setSortBy] = useState<EmployeeSortField>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const result = await getEmployees({ ...filters, page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder });
      setData(result);
      if (result.items.length === 0 && result.total > 0 && page > 1) setPage((current) => current - 1);
    } catch {
      setLoadError("دریافت فهرست کارمندان با مشکل روبه‌رو شد.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize, reloadKey, sortBy, sortOrder]);

  useEffect(() => { void loadEmployees(); }, [loadEmployees]);
  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => showToast("دریافت دیپارتمنت‌ها با مشکل روبه‌رو شد.", "error"));
  }, [showToast]);

  const updateFilters = (nextFilters: EmployeeFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const changeSort = (field: EmployeeSortField) => {
    if (sortBy === field) setSortOrder((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const openCreate = () => {
    setEditingEmployee(undefined);
    setFormOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  const afterSaved = (message: string) => {
    showToast(message);
    setPage(1);
    setReloadKey((key) => key + 1);
  };

  const removeEmployee = async (employee: Employee) => {
    try {
      await deleteEmployee(employee.id);
      showToast("کارمند از فهرست فعال حذف شد.");
      setReloadKey((key) => key + 1);
    } catch {
      showToast("حذف کارمند با مشکل روبه‌رو شد.", "error");
    }
  };

  const downloadExport = async () => {
    setIsExporting(true);
    try {
      await exportEmployees(filters);
      showToast("فایل اکسل با فیلترهای فعلی آماده دانلود شد.");
    } catch {
      showToast("صدور فایل اکسل با مشکل روبه‌رو شد.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return <div className="space-y-6">
    <PageHeader title="جدول عمومی" description="مدیریت یکپارچهٔ اطلاعات کارمندان و دیپارتمنت‌های مربوطه." actions={<><Button disabled={isExporting} variant="secondary" onClick={() => void downloadExport()}>{isExporting ? "در حال آماده‌سازی" : <><Download size={17} />صدور اکسل</>}</Button><Button variant="primary" onClick={openCreate}><Plus size={18} />افزودن کارمند</Button></>} />
    <EmployeeFiltersPanel filters={filters} departments={departments} onChange={updateFilters} onClear={() => updateFilters({ ...emptyEmployeeFilters })} />
    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted">{data ? `${data.total.toLocaleString("fa-AF")} کارمند یافت شد` : ""}</p><p className="text-muted">برای مرتب‌سازی، عنوان ستون‌های جدول را انتخاب کنید.</p></div>
    {isLoading ? <LoadingState title="در حال دریافت کارمندان" description="فهرست کارمندان در حال بارگذاری است." /> : loadError ? <div className="space-y-3"><ErrorState title="خطا در دریافت اطلاعات" description={loadError} /><Button onClick={() => void loadEmployees()}>کوشش دوباره</Button></div> : items.length === 0 ? <EmptyState title="کارمندی یافت نشد" description="فیلترها را تغییر دهید یا کارمند جدیدی ثبت کنید." /> : <><EmployeeTable employees={items} sortBy={sortBy} sortOrder={sortOrder} onSort={changeSort} onView={setDetailsEmployee} onEdit={openEdit} onDelete={(employee) => void removeEmployee(employee)} /><Pagination page={page} pageSize={pageSize} totalPages={totalPages} total={data?.total ?? 0} onPageChange={setPage} onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }} /></>}
    <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} departments={departments} employee={editingEmployee} onSaved={afterSaved} />
    <EmployeeDetailsDialog employee={detailsEmployee} onOpenChange={(open) => { if (!open) setDetailsEmployee(null); }} />
  </div>;
}

function Pagination({ page, pageSize, totalPages, total, onPageChange, onPageSizeChange }: { page: number; pageSize: number; totalPages: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void }) {
  if (!total) return null;
  return <div className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="text-muted">صفحهٔ {page.toLocaleString("fa-AF")} از {totalPages.toLocaleString("fa-AF")}</div><div className="flex items-center gap-2"><label className="flex items-center gap-2 text-muted">تعداد در هر صفحه<select className="h-9 rounded-lg border border-line bg-white px-2 text-ink" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size.toLocaleString("fa-AF")}</option>)}</select></label><Button className="h-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>قبلی</Button><Button className="h-9" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>بعدی</Button></div></div>;
}

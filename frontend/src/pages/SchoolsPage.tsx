import { usePaginatedList } from "../hooks/usePaginatedList";
import { DEFAULT_PAGE_SIZE, getTotalPages } from "../lib/pagination";
import { Download, LoaderCircle, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { deleteSchool, emptySchoolFilters, exportSchools, getSchools, type SchoolFilters } from "../api/schools";
import { SchoolDetailsDialog } from "../components/schools/SchoolDetailsDialog";
import { SchoolFormDialog } from "../components/schools/SchoolFormDialog";
import { SchoolTable } from "../components/schools/SchoolTable";
import { FilterToolbar } from "../components/shared/FilterToolbar";
import { PageHeader } from "../components/shared/PageHeader";
import { PaginationControls } from "../components/shared/PaginationControls";
import { SearchInput } from "../components/shared/SearchInput";
import { SearchableSelect } from "../components/shared/SearchableSelect";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { genderTypeOptions, schoolTypeOptions } from "../lib/schoolLabels";
import type { School } from "../types/api";

const pageSize = DEFAULT_PAGE_SIZE;

function hasFilters(filters: SchoolFilters) {
  return Object.values(filters).some(Boolean);
}

export function SchoolsPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<SchoolFilters>({ ...emptySchoolFilters });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<School | undefined>();
  const [details, setDetails] = useState<School | null>(null);
  const [reload, setReload] = useState(0);

  const fetchPage = useCallback(() => getSchools({ ...filters, page, page_size: pageSize, sort_by: "id", sort_order: "asc" }), [filters, page, reload]);
  const { data, loading, error, retry: load } = usePaginatedList({
    fetchPage, page, pageSize, onPageChange: setPage, errorMessage: "دریافت فهرست مکاتب با مشکل روبه‌رو شد.",
  });

  const updateFilter = (key: keyof SchoolFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => { setFilters({ ...emptySchoolFilters }); setPage(1); };
  const afterSaved = (message: string) => { showToast(message); setPage(1); setReload((current) => current + 1); };
  const remove = async (school: School) => {
    try {
      await deleteSchool(school.id);
      showToast("مکتب حذف شد.");
      setReload((current) => current + 1);
    } catch {
      showToast("حذف مکتب با مشکل روبه‌رو شد.", "error");
    }
  };
  const download = async () => {
    setExporting(true);
    try {
      await exportSchools(filters);
      showToast("فایل اکسل با فیلترهای فعلی آماده دانلود شد.");
    } catch {
      showToast("صدور فایل اکسل با مشکل روبه‌رو شد.", "error");
    } finally {
      setExporting(false);
    }
  };

  const activeAdvancedFilters = useMemo(() => [filters.school_code, filters.school_formation].filter(Boolean).length, [filters.school_code, filters.school_formation]);
  const schools = data?.items ?? [];
  const totalPages = getTotalPages(data?.total ?? 0, pageSize);

  return <div className="space-y-5 sm:space-y-6">
    <PageHeader title="مکاتب" description="مدیریت اطلاعات مکاتب و آمار شاگردان صنف‌های ۱ تا ۱۲" actions={<><Button variant="secondary" disabled={exporting} onClick={() => void download()}>{exporting ? <><LoaderCircle size={16} className="animate-spin" />در حال آماده‌سازی</> : <><Download size={16} />دانلود اکسل</>}</Button><Button variant="primary" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus size={16} />افزودن مکتب</Button></>} />
    <SchoolFiltersBar filters={filters} hasActiveFilters={hasFilters(filters)} activeAdvancedFilters={activeAdvancedFilters} onChange={updateFilter} onClear={clearFilters} />
    {loading ? <LoadingState title="در حال دریافت مکاتب" description="فهرست مکاتب در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت اطلاعات" description={error} onRetry={() => void load()} /> : schools.length === 0 ? <EmptyState title="مکتبی یافت نشد" description="فیلترها را تغییر دهید یا مکتب جدیدی ثبت کنید." /> : <><SchoolTable schools={schools} onDetails={setDetails} onEdit={(school) => { setEditing(school); setFormOpen(true); }} onDelete={(school) => void remove(school)} /></>}
    {!loading && !error && data ? <PaginationControls page={page} total={data?.total ?? 0} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} /> : null}
    <SchoolFormDialog open={formOpen} onOpenChange={setFormOpen} school={editing} onSaved={afterSaved} />
    <SchoolDetailsDialog school={details} onOpenChange={(open) => { if (!open) setDetails(null); }} />
  </div>;
}

interface SchoolFiltersBarProps {
  filters: SchoolFilters;
  hasActiveFilters: boolean;
  activeAdvancedFilters: number;
  onChange: (key: keyof SchoolFilters, value: string) => void;
  onClear: () => void;
}

function SchoolFiltersBar({ filters, hasActiveFilters, activeAdvancedFilters, onChange, onClear }: SchoolFiltersBarProps) {
  const advanced = <><label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">کد مکتب</span><input dir="ltr" className="input" value={filters.school_code} onChange={(event) => onChange("school_code", event.target.value)} /></label><label className="block"><span className="mb-1.5 block text-xs font-medium text-muted">تشکیل مکتب</span><input className="input" value={filters.school_formation} onChange={(event) => onChange("school_formation", event.target.value)} /></label></>;
  return <FilterToolbar advanced={advanced} activeAdvancedCount={activeAdvancedFilters} hasActiveFilters={hasActiveFilters} onClear={onClear}>
    <SearchInput className="sm:col-span-2" value={filters.search} onChange={(event) => onChange("search", event.target.value)} placeholder="جست‌وجوی نام، کد یا تشکیل مکتب" />
    <SearchableSelect value={filters.school_type_code} options={[{ value: "", label: "همه نوع‌های مکتب" }, ...schoolTypeOptions]} onChange={(value) => onChange("school_type_code", value)} placeholder="نوع مکتب" />
    <SearchableSelect value={filters.gender_type_code} options={[{ value: "", label: "همه نوع‌های جنسیت" }, ...genderTypeOptions]} onChange={(value) => onChange("gender_type_code", value)} placeholder="نوع جنسیت" />
  </FilterToolbar>;
}

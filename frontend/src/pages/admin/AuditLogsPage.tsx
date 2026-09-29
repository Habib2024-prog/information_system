import { usePaginatedList } from "../../hooks/usePaginatedList";
import { DEFAULT_PAGE_SIZE, getTotalPages } from "../../lib/pagination";
import { Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { emptyAuditFilters, getAuditLogs, type AuditFilters } from "../../api/auditLogs";
import { AuditDetailDialog } from "../../components/admin/AuditDetailDialog";
import { DataTableCards, DataTableShell, TableColumns } from "../../components/shared/DataTableShell";
import { DateRangeFilter, isValidDateRange } from "../../components/shared/DateRangeFilter";
import { FilterToolbar } from "../../components/shared/FilterToolbar";
import { PageHeader } from "../../components/shared/PageHeader";
import { PaginationControls } from "../../components/shared/PaginationControls";
import { SearchableSelect } from "../../components/shared/SearchableSelect";
import { EmptyState, ErrorState, LoadingState } from "../../components/shared/states";
import { Button } from "../../components/ui/button";
import { auditActionOptions, auditEntityOptions, getAuditActionLabel, getAuditEntityLabel } from "../../lib/auditLabels";
import { formatJalaliDateTime } from "../../lib/date";
import type { AuditLog } from "../../types/audit";

const pageSize = DEFAULT_PAGE_SIZE;
export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>({ ...emptyAuditFilters });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);
  const validRange = isValidDateRange(filters.date_from, filters.date_to);
  const fetchPage = useCallback(() => getAuditLogs(filters, page, pageSize), [filters, page, reload]);
  const { data, loading, error, retry } = usePaginatedList({
    fetchPage, page, pageSize, onPageChange: setPage, enabled: validRange, errorMessage: "دریافت گزارش فعالیت‌ها ممکن نشد.",
  });
  const update = (key: keyof AuditFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const activeCount = [filters.date_from, filters.date_to, filters.user_id, filters.entity_id].filter(Boolean).length;
  const detailAction = (record: AuditLog) => <Button variant="ghost" className="size-8 px-0" onClick={() => setDetailId(record.id)} title="مشاهده جزئیات" aria-label="مشاهده جزئیات"><Eye size={16} /></Button>;
  return <div className="space-y-5 sm:space-y-6">
    <PageHeader title="گزارش فعالیت‌ها" description="سوابق فعالیت کاربران در سیستم" />
    <FilterToolbar compact onClear={() => { setFilters({ ...emptyAuditFilters }); setPage(1); }} hasActiveFilters={Object.values(filters).some(Boolean)} activeAdvancedCount={activeCount} advanced={<>
      <DateRangeFilter className="sm:col-span-2" from={filters.date_from} to={filters.date_to} onFromChange={(value) => update("date_from", value)} onToChange={(value) => update("date_to", value)} />
      <label className="block"><span className="mb-1 block text-xs font-medium text-muted">شماره کاربر</span><input className="input" dir="ltr" inputMode="numeric" value={filters.user_id} onChange={(event) => { const value = event.target.value; if (!value || /^[1-9]\d*$/.test(value)) update("user_id", value); }} /></label>
      <label className="block"><span className="mb-1 block text-xs font-medium text-muted">شناسه رکورد</span><input className="input" dir="ltr" inputMode="numeric" value={filters.entity_id} onChange={(event) => { const value = event.target.value; if (!value || /^[1-9]\d*$/.test(value)) update("entity_id", value); }} /></label>
    </>}>
      <SearchableSelect ariaLabel="نوع عملیات" value={filters.action} options={[{ value: "", label: "همه عملیات" }, ...auditActionOptions]} placeholder="نوع عملیات" onChange={(value) => update("action", value)} />
      <SearchableSelect ariaLabel="نوع رکورد" value={filters.entity_type} options={[{ value: "", label: "همه رکوردها" }, ...auditEntityOptions]} placeholder="نوع رکورد" onChange={(value) => update("entity_type", value)} />
    </FilterToolbar>
    {!validRange ? <ErrorState title="بازهٔ تاریخ معتبر نیست" description="تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد." /> : loading ? <LoadingState title="در حال دریافت فعالیت‌ها" description="سوابق فعالیت در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت فعالیت‌ها" description={error} onRetry={retry} /> : !data?.items.length ? <EmptyState title="فعالیتی یافت نشد" description="برای این فیلترها سابقه‌ای ثبت نشده است." /> : <>
      <DataTableShell bounded responsive><table className="data-table w-full table-fixed"><TableColumns widths={[18, 22, 12, 15, 8, 17, 8]} /><thead><tr>{["تاریخ و زمان", "کاربر", "عملیات", "نوع رکورد", "شناسه", "توضیحات", "جزئیات"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((record) => <tr key={record.id}>
        <td><time dateTime={record.created_at} className="block text-xs leading-5" title={formatJalaliDateTime(record.created_at)}>{formatJalaliDateTime(record.created_at)}</time></td>
        <td><span className="block truncate font-medium" title={record.user.full_name}>{record.user.full_name}</span><bdi className="block truncate text-xs text-muted" title={record.user.username}>{record.user.username}</bdi></td>
        <td><span className="block truncate rounded-md bg-slate-100 px-2 py-0.5 text-xs text-muted" title={getAuditActionLabel(record.action)}>{getAuditActionLabel(record.action)}</span></td>
        <td><span className="block truncate" title={getAuditEntityLabel(record.entity_type)}>{getAuditEntityLabel(record.entity_type)}</span></td><td>{record.entity_id?.toLocaleString("fa-AF") ?? "عمومی"}</td>
        <td><span className="block truncate text-muted" title={record.description}>{record.description}</span></td><td>{detailAction(record)}</td>
      </tr>)}</tbody></table></DataTableShell>
      <DataTableCards>{data.items.map((record) => <article key={record.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{record.user.full_name}</h2><time dateTime={record.created_at} className="mt-1 block text-xs text-muted">{formatJalaliDateTime(record.created_at)}</time></div>{detailAction(record)}</div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-accent-soft px-2 py-1 text-accent">{getAuditActionLabel(record.action)}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-muted">{getAuditEntityLabel(record.entity_type)}</span><span className="px-1 py-1 text-muted">شناسه: {record.entity_id?.toLocaleString("fa-AF") ?? "عمومی"}</span></div><p className="mt-2 line-clamp-2 text-sm text-muted">{record.description}</p></article>)}</DataTableCards>
    </>}
    {validRange && !loading && !error && data ? <PaginationControls page={page} totalPages={getTotalPages(data.total, pageSize)} total={data.total} onPageChange={setPage} /> : null}
    <AuditDetailDialog id={detailId} onClose={() => setDetailId(null)} />
  </div>;
}

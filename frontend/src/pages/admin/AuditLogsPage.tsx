import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { emptyAuditFilters, getAuditLogs, type AuditFilters } from "../../api/auditLogs";
import { ApiError } from "../../api/client";
import { AuditDetailDialog } from "../../components/admin/AuditDetailDialog";
import { DataTableShell } from "../../components/shared/DataTableShell";
import { DateRangeFilter, isValidDateRange } from "../../components/shared/DateRangeFilter";
import { FilterToolbar } from "../../components/shared/FilterToolbar";
import { PageHeader } from "../../components/shared/PageHeader";
import { PaginationControls } from "../../components/shared/PaginationControls";
import { SearchableSelect } from "../../components/shared/SearchableSelect";
import { EmptyState, ErrorState, LoadingState } from "../../components/shared/states";
import { Button } from "../../components/ui/button";
import { auditActionOptions, auditEntityOptions, getAuditActionLabel, getAuditEntityLabel } from "../../lib/auditLabels";
import { formatApiDateTime } from "../../lib/date";
import type { PaginatedResponse } from "../../types/api";
import type { AuditLog } from "../../types/audit";

const pageSize = 20;
export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>({ ...emptyAuditFilters });
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);
  const validRange = isValidDateRange(filters.date_from, filters.date_to);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    if (!validRange) { setLoading(false); return; }
    setLoading(true);
    getAuditLogs(filters, page, pageSize).then((result) => { if (active) setData(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "دریافت گزارش فعالیت‌ها ممکن نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, reload, validRange]);
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
    {!validRange ? <ErrorState title="بازهٔ تاریخ معتبر نیست" description="تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد." /> : loading ? <LoadingState title="در حال دریافت فعالیت‌ها" description="سوابق فعالیت در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت فعالیت‌ها" description={error} onRetry={() => setReload((value) => value + 1)} /> : !data?.items.length ? <EmptyState title="فعالیتی یافت نشد" description="برای این فیلترها سابقه‌ای ثبت نشده است." /> : <>
      <DataTableShell className="hidden lg:block"><table className="data-table w-full table-fixed"><colgroup><col className="w-40" /><col /><col className="w-28" /><col className="w-36" /><col className="w-20" /><col /><col className="w-20" /></colgroup><thead><tr>{["تاریخ و زمان", "کاربر", "عملیات", "نوع رکورد", "شناسه", "توضیحات", "جزئیات"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((record) => <tr key={record.id}>
        <td><time dateTime={record.created_at} className="block whitespace-nowrap text-xs" title={formatApiDateTime(record.created_at)}>{formatApiDateTime(record.created_at)}</time></td>
        <td><span className="block truncate font-medium" title={record.user.full_name}>{record.user.full_name}</span><bdi className="block truncate text-xs text-muted" title={record.user.username}>{record.user.username}</bdi></td>
        <td><span className="block truncate rounded-md bg-slate-100 px-2 py-0.5 text-xs text-muted" title={getAuditActionLabel(record.action)}>{getAuditActionLabel(record.action)}</span></td>
        <td><span className="block truncate" title={getAuditEntityLabel(record.entity_type)}>{getAuditEntityLabel(record.entity_type)}</span></td><td>{record.entity_id?.toLocaleString("fa-AF") ?? "عمومی"}</td>
        <td><span className="block truncate text-muted" title={record.description}>{record.description}</span></td><td>{detailAction(record)}</td>
      </tr>)}</tbody></table></DataTableShell>
      <div className="space-y-3 lg:hidden">{data.items.map((record) => <article key={record.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{record.user.full_name}</h2><time dateTime={record.created_at} className="mt-1 block text-xs text-muted">{formatApiDateTime(record.created_at)}</time></div>{detailAction(record)}</div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-accent-soft px-2 py-1 text-accent">{getAuditActionLabel(record.action)}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-muted">{getAuditEntityLabel(record.entity_type)}</span><span className="px-1 py-1 text-muted">شناسه: {record.entity_id?.toLocaleString("fa-AF") ?? "عمومی"}</span></div><p className="mt-2 line-clamp-2 text-sm text-muted">{record.description}</p></article>)}</div>
      <PaginationControls page={page} totalPages={Math.max(1, Math.ceil(data.total / pageSize))} total={data.total} onPageChange={setPage} />
    </>}
    <AuditDetailDialog id={detailId} onClose={() => setDetailId(null)} />
  </div>;
}

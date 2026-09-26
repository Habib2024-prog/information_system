import { Download, Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getEmployee } from "../../api/employees";
import { getAmirObservation, getTeacherObservation, type AmirObservationDetail, type TeacherObservationDetail } from "../../api/observations";
import { emptyObservationHistoryFilters, exportObservationHistory, getObservationHistory, type ObservationHistoryFilters, type ObservationHistoryItem } from "../../api/scientificMembers";
import { getJobTitleLabel } from "../../lib/employeeLabels";
import { formatApiDate } from "../../lib/date";
import { getFinalResultLabel, getObservationTypeLabel } from "../../lib/observationLabels";
import type { ScientificMember } from "../../types/api";
import { ObservationDetailDialog } from "../observations/ObservationDetailDialog";
import { AppDialog } from "../shared/AppDialog";
import { DataTableShell } from "../shared/DataTableShell";
import { isValidDateRange } from "../shared/DateRangeFilter";
import { PaginationControls } from "../shared/PaginationControls";
import { SearchableSelect } from "../shared/SearchableSelect";
import { EmptyState, ErrorState, LoadingState } from "../shared/states";
import { Button } from "../ui/button";

interface Props { member: ScientificMember | null; onOpenChange: (open: boolean) => void; }
type DetailData = TeacherObservationDetail | AmirObservationDetail;
const typeOptions = [{ value: "", label: "همه انواع مشاهده" }, { value: "teacher", label: "مشاهده معلم" }, { value: "amir_senior_teacher", label: "مشاهده آمر / سرمعلم" }];
const resultOptions = [{ value: "", label: "همه نتیجه‌ها" }, { value: "needs_improvement", label: "نیازمند بهبود" }, { value: "has_capability", label: "دارای قابلیت" }, { value: "basic_capability", label: "قابلیت ابتدایی" }, { value: "applied_capability", label: "قابلیت بکارگیری" }, { value: "mastery", label: "تسلط بر قابلیت / مسلط بر قابلیت" }];

export function ObservationHistoryDialog({ member, onOpenChange }: Props) {
  const [filters, setFilters] = useState<ObservationHistoryFilters>({ ...emptyObservationHistoryFilters });
  const [items, setItems] = useState<ObservationHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [detailItem, setDetailItem] = useState<ObservationHistoryItem | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailWorkplace, setDetailWorkplace] = useState("");
  const load = useCallback(async () => { if (!member || !isValidDateRange(filters.date_from, filters.date_to)) return; setLoading(true); setError(""); try { const response = await getObservationHistory(member.id, { ...filters, page, page_size: 20 }); setItems(response.items); setTotal(response.total); } catch { setError("دریافت سوابق مشاهدات با مشکل روبه‌رو شد."); } finally { setLoading(false); } }, [filters, member, page]);
  useEffect(() => { if (member) { setFilters({ ...emptyObservationHistoryFilters }); setPage(1); setItems([]); setTotal(0); } }, [member]);
  useEffect(() => { if (member) void load(); }, [load, member]);
  const update = (key: keyof ObservationHistoryFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const openDetail = async (item: ObservationHistoryItem) => { setDetailItem(item); setDetailData(null); setDetailError(""); setDetailWorkplace(""); setDetailLoading(true); try { const [data, employee] = await Promise.all([item.observation_type === "teacher" ? getTeacherObservation(item.observed_employee_id, item.observation_id) : getAmirObservation(item.observed_employee_id, item.observation_id), getEmployee(item.observed_employee_id)]); setDetailData(data); setDetailWorkplace(employee.school_workplace); } catch { setDetailError("دریافت جزئیات مشاهده با مشکل روبه‌رو شد."); } finally { setDetailLoading(false); } };
  const download = async () => { if (!member) return; setExporting(true); try { await exportObservationHistory(member.id); } catch { setError("صدور فایل اکسل مشاهدات با مشکل روبه‌رو شد."); } finally { setExporting(false); } };
  return <><AppDialog open={Boolean(member)} onOpenChange={onOpenChange} size="xl" title="سوابق مشاهدات" description={member ? `${member.name} ${member.surname}` : ""} footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>بستن</Button>}><div className="flex flex-col gap-4"><HistoryFilters filters={filters} exporting={exporting} onExport={() => void download()} onChange={update} onClear={() => { setFilters({ ...emptyObservationHistoryFilters }); setPage(1); }} />{!isValidDateRange(filters.date_from, filters.date_to) ? null : loading ? <LoadingState title="در حال دریافت مشاهدات" description="سوابق مشاهدات در حال بارگذاری است." /> : error ? <ErrorState title="خطا در دریافت اطلاعات" description={error} onRetry={() => void load()} /> : items.length === 0 ? <EmptyState title="مشاهده‌ای یافت نشد" description="برای این عضو علمی سابقه فعال ثبت نشده است." /> : <><HistoryTable items={items} onDetail={(item) => void openDetail(item)} /><PaginationControls page={page} total={total} totalPages={Math.max(1, Math.ceil(total / 20))} pageSize={20} onPageChange={setPage} /></>}</div></AppDialog><ObservationDetailDialog open={Boolean(detailItem)} onOpenChange={(open) => { if (!open) { setDetailItem(null); setDetailData(null); setDetailError(""); setDetailWorkplace(""); } }} kind={detailItem?.observation_type ?? "teacher"} identity={detailItem ? { employeeName: detailItem.observed_employee_name, fatherName: detailItem.observed_employee_father_name, workplace: detailWorkplace, jobTitleCode: detailItem.observed_employee_job_title_code } : null} data={detailData} loading={detailLoading} error={detailError} /></>;
}

function HistoryFilters({ filters, exporting, onExport, onChange, onClear }: {
  filters: ObservationHistoryFilters;
  exporting: boolean;
  onExport: () => void;
  onChange: (key: keyof ObservationHistoryFilters, value: string) => void;
  onClear: () => void;
}) {
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  return <section className="border-b border-line/70 pb-4" aria-label="فیلتر سوابق مشاهدات">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-medium text-ink">فیلتر سوابق مشاهدات</p>
      <div className="flex items-center gap-2">
        {hasActiveFilters ? <Button className="h-9 px-2.5 text-xs" variant="ghost" onClick={onClear}>پاک‌کردن فیلترها</Button> : null}
        <Button className="h-9" disabled={exporting} variant="secondary" onClick={onExport}><Download size={16} />{exporting ? "در حال آماده‌سازی" : "دانلود اکسل"}</Button>
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <FilterField label="نوع مشاهده"><SearchableSelect value={filters.observation_type} options={typeOptions} onChange={(value) => onChange("observation_type", value)} placeholder="همه انواع مشاهده" /></FilterField>
      <FilterField label="نتیجه"><SearchableSelect value={filters.final_result_code} options={resultOptions} onChange={(value) => onChange("final_result_code", value)} placeholder="همه نتیجه‌ها" /></FilterField>
      <FilterField label="از تاریخ"><input className="input" type="date" value={filters.date_from} onChange={(event) => onChange("date_from", event.target.value)} /></FilterField>
      <FilterField label="تا تاریخ"><input className="input" type="date" value={filters.date_to} onChange={(event) => onChange("date_to", event.target.value)} /></FilterField>
      <FilterField label="شماره کارمند"><input className="input" inputMode="numeric" value={filters.employee_id} onChange={(event) => onChange("employee_id", event.target.value)} /></FilterField>
    </div>
    {!isValidDateRange(filters.date_from, filters.date_to) ? <p className="mt-2 text-xs text-rose-700" role="alert">تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.</p> : null}
  </section>;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}</label>;
}

function HistoryTable({ items, onDetail }: { items: ObservationHistoryItem[]; onDetail: (item: ObservationHistoryItem) => void }) {
  return <>
    <DataTableShell className="hidden overflow-hidden xl:block">
      <table className="data-table w-full table-fixed">
        <colgroup>
          <col className="w-[6.75rem]" />
          <col className="w-[18%]" />
          <col className="w-[6.75rem]" />
          <col className="w-[8rem]" />
          <col className="w-[15%]" />
          <col className="w-[5.25rem]" />
          <col className="w-[8.25rem]" />
          <col className="w-[5.5rem]" />
        </colgroup>
        <thead><tr><th>تاریخ</th><th>کارمند مشاهده‌شده</th><th>عنوان وظیفه</th><th>نوع مشاهده</th><th>مضمون</th><th>مجموع</th><th>نتیجه</th><th className="text-center">عملیات</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.observation_type + "-" + item.observation_id}>
          <td dir="ltr" className="whitespace-nowrap tabular-nums">{formatApiDate(item.observation_date)}</td>
          <td className="truncate font-medium text-ink" title={item.observed_employee_name}>{item.observed_employee_name}</td>
          <td className="truncate" title={getJobTitleLabel(item.observed_employee_job_title_code)}>{getJobTitleLabel(item.observed_employee_job_title_code)}</td>
          <td className="truncate" title={getObservationTypeLabel(item.observation_type)}>{getObservationTypeLabel(item.observation_type)}</td>
          <td className="truncate" title={item.subject}>{item.subject}</td>
          <td dir="ltr" className="whitespace-nowrap tabular-nums">{Number(item.total_score).toFixed(2)}</td>
          <td><HistoryResultBadge result={getFinalResultLabel(item.final_result_code, item.observation_type)} /></td>
          <td className="text-center"><Button variant="ghost" className="h-8 px-2" onClick={() => onDetail(item)}><Eye size={15} />جزئیات</Button></td>
        </tr>)}</tbody>
      </table>
    </DataTableShell>
    <div className="space-y-3 xl:hidden">{items.map((item) => <article key={item.observation_type + "-" + item.observation_id} className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p dir="ltr" className="whitespace-nowrap text-xs tabular-nums text-muted">{formatApiDate(item.observation_date)}</p><h2 className="mt-1 truncate text-sm font-semibold text-ink">{item.observed_employee_name}</h2><p className="mt-1 truncate text-sm text-muted">{getObservationTypeLabel(item.observation_type)} · {item.subject}</p></div>
        <HistoryResultBadge result={getFinalResultLabel(item.final_result_code, item.observation_type)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span dir="ltr" className="whitespace-nowrap text-sm tabular-nums text-muted">{Number(item.total_score).toFixed(2)}</span><Button variant="ghost" className="h-8 px-2" onClick={() => onDetail(item)}><Eye size={15} />جزئیات</Button></div>
    </article>)}</div>
  </>;
}

function HistoryResultBadge({ result }: { result: string }) {
  return <span className="inline-flex max-w-full truncate whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{result}</span>;
}

import { useEffect, useState } from "react";
import { getAuditLog } from "../../api/auditLogs";
import { ApiError } from "../../api/client";
import { formatAuditValue, getAuditActionLabel, getAuditEntityLabel, getAuditFieldLabel, sanitizeAuditJson } from "../../lib/auditLabels";
import { formatApiDateTime } from "../../lib/date";
import type { AuditLog, JsonValue } from "../../types/audit";
import { AppDialog } from "../shared/AppDialog";
import { ErrorState, LoadingState } from "../shared/states";
import { Button } from "../ui/button";

export function AuditDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const [data, setData] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    if (id === null) return;
    setLoading(true);
    getAuditLog(id).then((record) => { if (active) setData(record); }).catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "دریافت جزئیات ممکن نشد."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reload]);
  return <AppDialog open={id !== null} onOpenChange={(open) => { if (!open) onClose(); }} title="جزئیات فعالیت" description="اطلاعات ثبت‌شده دربارهٔ این فعالیت" size="lg" footer={<Button onClick={onClose}>بستن</Button>}>
    {loading ? <LoadingState title="در حال دریافت جزئیات" description="لطفاً کمی منتظر بمانید." /> : error ? <ErrorState title="دریافت جزئیات ممکن نشد" description={error} onRetry={() => setReload((value) => value + 1)} /> : data ? <div className="space-y-5">
      <dl className="grid gap-4 border-b border-line pb-5 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="کاربر" value={data.user.full_name} /><Detail label="نام کاربری" value={data.user.username} /><Detail label="عملیات" value={getAuditActionLabel(data.action)} />
        <Detail label="نوع رکورد" value={getAuditEntityLabel(data.entity_type)} /><Detail label="شناسه رکورد" value={data.entity_id?.toLocaleString("fa-AF") ?? "عمومی"} /><Detail label="تاریخ و زمان" value={formatApiDateTime(data.created_at)} />
        <Detail label="نشانی شبکه" value={data.ip_address ?? "ثبت نشده"} ltr /><div className="sm:col-span-2"><Detail label="توضیحات" value={data.description} /></div>
      </dl>
      {data.before_data ? <Snapshot title="قبل از تغییر" value={data.before_data} entity={data.entity_type} /> : null}
      {data.after_data ? <Snapshot title="بعد از تغییر" value={data.after_data} entity={data.entity_type} /> : null}
      {data.metadata ? <Snapshot title="اطلاعات اضافی" value={data.metadata} entity={data.entity_type} /> : null}
    </div> : <ErrorState title="اطلاعات در دسترس نیست" description="دوباره تلاش کنید." />}
  </AppDialog>;
}
function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6" dir={ltr ? "ltr" : "auto"}>{value}</dd></div>;
}
function Snapshot({ title, value, entity }: { title: string; value: JsonValue; entity: string }) {
  return <section className="space-y-3"><h2 className="text-sm font-semibold">{title}</h2><JsonDetails value={sanitizeAuditJson(value)} entity={entity} /></section>;
}
function JsonDetails({ value, entity, field = "" }: { value: JsonValue; entity: string; field?: string }) {
  if (Array.isArray(value)) return <ol className="space-y-2">{value.map((entry, index) => <li key={index} className="rounded-lg border border-line/70 p-3"><p className="mb-2 text-xs text-muted">مورد {(index + 1).toLocaleString("fa-AF")}</p><JsonDetails value={entry} field={field} entity={entity} /></li>)}</ol>;
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const recordEntity = value.observation_type === "amir_senior_teacher" ? "amir_observation" : value.observation_type === "teacher" ? "teacher_observation" : entity;
    if (!entries.length) return <p className="text-sm text-muted">اطلاعاتی ثبت نشده است.</p>;
    return <dl className="grid gap-x-6 gap-y-3 rounded-lg bg-slate-50/70 p-4 sm:grid-cols-2">{entries.map(([key, entry]) => <div key={key} className={entry && typeof entry === "object" ? "min-w-0 sm:col-span-2" : "min-w-0"}><dt className="mb-1 text-xs text-muted">{getAuditFieldLabel(key)}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-6"><JsonDetails value={entry} field={key} entity={recordEntity} /></dd></div>)}</dl>;
  }
  return <bdi>{formatAuditValue(field, value, entity)}</bdi>;
}

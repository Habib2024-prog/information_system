import type { ReactNode } from "react";
import { getAuditChanges, getAuditExtraDetails, getAuditIdentity, isAuditObject } from "../../lib/auditDetails";
import { formatAuditValue, getAuditActionLabel, getAuditEntityLabel, getAuditFieldLabel } from "../../lib/auditLabels";
import { formatJalaliDateTime } from "../../lib/date";
import type { AuditLog, JsonValue } from "../../types/audit";
import { DataTableShell } from "../shared/DataTableShell";

/** Presentational body shared by both compact and historical activity records. */
export function AuditDetailContent({ record }: { record: AuditLog }) {
  const isUpdate = record.action === "UPDATE" || record.action === "UPDATE_OBSERVATION";
  const isCreate = record.action === "CREATE" || record.action === "CREATE_OBSERVATION";
  const isDelete = record.action === "DELETE" || record.action === "DELETE_OBSERVATION";
  const changes = isUpdate ? getAuditChanges(record) : [];
  const identity = getAuditIdentity(record);
  const extra = getAuditExtraDetails(record);
  return <div dir="rtl" className="space-y-6 text-ink">
    <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-line/80 bg-canvas/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Summary label="نوع عملیات"><span className="inline-flex rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{getAuditActionLabel(record.action)}</span></Summary>
      <Summary label="بخش / نوع رکورد">{getAuditEntityLabel(record.entity_type)}</Summary>
      <Summary label="انجام‌دهنده">{record.user.full_name || record.user.username}</Summary>
      <Summary label="تاریخ و زمان">{formatJalaliDateTime(record.created_at)}</Summary>
      {record.entity_id !== null ? <Summary label="شناسه رکورد"><bdi>{record.entity_id.toLocaleString("fa-AF")}</bdi></Summary> : null}
      {record.ip_address ? <Summary label="نشانی شبکه"><bdi dir="ltr">{record.ip_address}</bdi></Summary> : null}
    </dl>
    {isUpdate ? <section aria-labelledby="audit-changes-title" className="space-y-3">
      <h2 id="audit-changes-title" className="text-sm font-semibold">جزئیات تغییرات</h2>
      {!changes.length ? <p className="text-sm text-muted">تغییری در اطلاعات ثبت نشده است.</p> : <>
        <DataTableShell className="hidden sm:block"><table className="data-table w-full table-fixed">
          <thead><tr><th className="w-1/4">نام فیلد</th><th>مقدار قبلی</th><th>مقدار جدید</th></tr></thead>
          <tbody>{changes.map((change) => <tr key={change.field}>
            <th scope="row" className="whitespace-normal break-words align-top text-sm font-medium">{getAuditFieldLabel(change.field)}</th>
            <td className="align-top text-muted"><AuditValue value={change.old} field={change.field} entity={record.entity_type} /></td>
            <td className="align-top"><AuditValue value={change.new} field={change.field} entity={record.entity_type} /></td>
          </tr>)}</tbody>
        </table></DataTableShell>
        <div className="space-y-3 sm:hidden">{changes.map((change) => <section key={change.field} className="rounded-lg border border-line p-3">
          <h3 className="mb-3 text-sm font-medium">{getAuditFieldLabel(change.field)}</h3>
          <dl className="grid grid-cols-2 gap-3"><Summary label="مقدار قبلی"><AuditValue value={change.old} field={change.field} entity={record.entity_type} /></Summary><Summary label="مقدار جدید"><AuditValue value={change.new} field={change.field} entity={record.entity_type} /></Summary></dl>
        </section>)}</div>
      </>}
    </section> : isCreate || isDelete || Object.keys(identity).length ? <section className="space-y-3">
      <h2 className="text-sm font-semibold">{isCreate ? "اطلاعات رکورد ایجادشده" : isDelete ? "اطلاعات رکورد حذف‌شده" : "اطلاعات رکورد"}</h2>
      <AuditValue value={identity} entity={record.entity_type} />
    </section> : null}
    {Object.keys(extra).length ? <section className="space-y-3"><h2 className="text-sm font-semibold">اطلاعات اضافی</h2><AuditValue value={extra} entity={record.entity_type} /></section> : null}
  </div>;
}

function Summary({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{children}</dd></div>;
}
function AuditValue({ value, field = "", entity }: { value: JsonValue; field?: string; entity: string }) {
  if (Array.isArray(value)) return value.length ? <ul className="space-y-2">{value.map((item, index) => <li key={index} className="min-w-0"><AuditValue value={item} field={field} entity={entity} /></li>)}</ul> : <span>—</span>;
  if (isAuditObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <span className="text-sm text-muted">—</span>;
    return <dl className="grid min-w-0 gap-3">{entries.map(([key, item]) => <Summary key={key} label={getAuditFieldLabel(key)}><AuditValue value={item} field={key} entity={entity} /></Summary>)}</dl>;
  }
  return <bdi className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{formatAuditValue(field, value, entity)}</bdi>;
}

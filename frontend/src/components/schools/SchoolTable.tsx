import { Eye, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type { School } from "../../types/api";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { DataTableCards, DataTableShell, TableColumns } from "../shared/DataTableShell";
import { Button } from "../ui/button";

interface SchoolTableProps {
  schools: School[];
  onDetails: (school: School) => void;
  onEdit: (school: School) => void;
  onDelete: (school: School) => void;
}

interface IconActionProps {
  title: string;
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function IconAction({ title, icon, onClick, danger = false }: IconActionProps) {
  return <Button type="button" variant="ghost" className={`h-8 w-8 px-0 ${danger ? "text-rose-700 hover:bg-rose-50" : ""}`} title={title} aria-label={title} onClick={onClick}>{icon}</Button>;
}

function SchoolActions({ school, onDetails, onEdit, onDelete }: Omit<SchoolTableProps, "schools"> & { school: School }) {
  return <div className="flex items-center gap-1"><IconAction title="مشاهده جزئیات" icon={<Eye size={16} />} onClick={() => onDetails(school)} /><IconAction title="ویرایش" icon={<Pencil size={16} />} onClick={() => onEdit(school)} /><ConfirmDialog title="حذف مکتب" description={`آیا از حذف «${school.school_name}» مطمئن هستید؟`} confirmLabel="حذف" onConfirm={() => onDelete(school)} trigger={<IconAction title="حذف" icon={<Trash2 size={16} />} danger />} /></div>;
}

export function SchoolTable({ schools, onDetails, onEdit, onDelete }: SchoolTableProps) {
  return <>
    <DataTableShell bounded responsive>
      <table className="data-table table-fixed"><TableColumns widths={[6, 26, 15, 12, 12, 11, 18]} /><thead><tr><th>شماره</th><th>نام مکتب</th><th>کد مکتب</th><th>نوع مکتب</th><th>نوع جنسیت</th><th>صنوف فعال</th><th>عملیات</th></tr></thead>
        <tbody>{schools.map((school) => <tr key={school.id}><td className="text-muted">{school.id.toLocaleString("fa-AF")}</td><td className="font-medium text-ink"><span className="block truncate" title={school.school_name}>{school.school_name}</span></td><td><span dir="ltr" className="block truncate text-right" title={school.school_code}>{school.school_code}</span></td><td>{school.school_type_display_name}</td><td>{school.gender_type_display_name}</td><td>{school.active_class_section_count.toLocaleString("fa-AF")}</td><td><SchoolActions school={school} onDetails={onDetails} onEdit={onEdit} onDelete={onDelete} /></td></tr>)}</tbody>
      </table>
    </DataTableShell>
    <DataTableCards>{schools.map((school) => <article key={school.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted">کد مکتب: <span dir="ltr">{school.school_code}</span></p><h2 className="mt-1 truncate text-sm font-semibold text-ink">{school.school_name}</h2><p className="mt-1 text-sm text-muted">{school.school_type_display_name} · {school.gender_type_display_name}</p></div><SchoolActions school={school} onDetails={onDetails} onEdit={onEdit} onDelete={onDelete} /></div><div className="mt-3 border-t border-line pt-3 text-sm text-muted">تعداد صنوف فعال: <span className="font-medium text-ink">{school.active_class_section_count.toLocaleString("fa-AF")}</span></div></article>)}</DataTableCards>
  </>;
}

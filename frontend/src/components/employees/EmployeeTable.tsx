import { ArrowDown, ArrowUp, Eye, Pencil, Trash2 } from "lucide-react";

import type { Employee } from "../../types/api";
import type { EmployeeSortField } from "../../api/employees";
import { getJobTitleLabel } from "../../lib/employeeLabels";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { DataTableShell } from "../shared/DataTableShell";
import { Button } from "../ui/button";

interface EmployeeTableProps {
  employees: Employee[];
  sortBy: EmployeeSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: EmployeeSortField) => void;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export function EmployeeTable({ employees, sortBy, sortOrder, onSort, onView, onEdit, onDelete }: EmployeeTableProps) {
  const sortIcon = (field: EmployeeSortField) => sortBy === field ? sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : null;
  const heading = (label: string, field: EmployeeSortField) => <button className="inline-flex items-center gap-1 font-semibold hover:text-ink" onClick={() => onSort(field)}>{label}{sortIcon(field)}</button>;

  return (
    <>
      <DataTableShell className="hidden lg:block">
        <table className="data-table">
          <thead className="bg-slate-50 text-muted"><tr>
            <th className="whitespace-nowrap px-4 py-3">{heading("شماره", "id")}</th>
            <th className="whitespace-nowrap px-4 py-3">{heading("اسم", "name")}</th>
            <th className="whitespace-nowrap px-4 py-3">{heading("ولد", "father_name")}</th>
            <th className="whitespace-nowrap px-4 py-3">{heading("عنوان وظیفه", "job_title_code")}</th>
            <th className="whitespace-nowrap px-4 py-3">{heading("محل وظیفه", "school_workplace")}</th>
            <th className="whitespace-nowrap px-4 py-3">دیپارتمنت</th>
            <th className="whitespace-nowrap px-4 py-3">مشاهدات</th>
            <th className="whitespace-nowrap px-4 py-3">عملیات</th>
          </tr></thead>
          <tbody className="divide-y divide-line bg-white">{employees.map((employee) => <tr key={employee.id} className="hover:bg-slate-50/80">
            <td className="px-4 py-3 text-muted">{employee.id}</td>
            <td className="px-4 py-3 font-medium text-ink">{employee.name}</td>
            <td className="px-4 py-3 text-ink">{employee.father_name}</td>
            <td className="px-4 py-3 text-ink">{getJobTitleLabel(employee.job_title_code)}</td>
            <td className="max-w-48 truncate px-4 py-3 text-ink" title={employee.school_workplace}>{employee.school_workplace}</td>
            <td className="max-w-56 px-4 py-3 text-ink">{departmentNames(employee)}</td>
            <td className="px-4 py-3"><ObservationCount count={employee.observation_count} /></td>
            <td className="px-4 py-3"><EmployeeActions employee={employee} onView={onView} onEdit={onEdit} onDelete={onDelete} /></td>
          </tr>)}</tbody>
        </table>
      </DataTableShell>
      <div className="space-y-3 lg:hidden">{employees.map((employee) => <article key={employee.id} className="rounded-xl border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">شمارهٔ ثبت: {employee.id}</p><h2 className="mt-1 font-bold text-ink">{employee.name}</h2><p className="mt-1 text-sm text-muted">ولد: {employee.father_name}</p></div><EmployeeActions employee={employee} onView={onView} onEdit={onEdit} onDelete={onDelete} /></div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm"><div><dt className="text-xs text-muted">عنوان وظیفه</dt><dd className="mt-1 text-ink">{getJobTitleLabel(employee.job_title_code)}</dd></div><div><dt className="text-xs text-muted">محل وظیفه</dt><dd className="mt-1 break-words text-ink">{employee.school_workplace}</dd></div><div><dt className="text-xs text-muted">تعداد مشاهدات</dt><dd className="mt-1"><ObservationCount count={employee.observation_count} /></dd></div><div className="col-span-2"><dt className="text-xs text-muted">دیپارتمنت</dt><dd className="mt-1 text-ink">{departmentNames(employee)}</dd></div></dl>
      </article>)}</div>
    </>
  );
}

function departmentNames(employee: Employee) {
  return employee.departments.map((department) => getDepartmentLabel(department.code, department.display_name)).join("، ") || "—";
}

function ObservationCount({ count }: { count: number }) {
  return <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium tabular-nums text-slate-700">{count.toLocaleString("fa-AF")}</span>;
}

function EmployeeActions({ employee, onView, onEdit, onDelete }: Pick<EmployeeTableProps, "onView" | "onEdit" | "onDelete"> & { employee: Employee }) {
  return <div className="flex items-center gap-1"><Button className="h-8 w-8 px-0" variant="ghost" title="مشاهده جزئیات" aria-label="مشاهده جزئیات" onClick={() => onView(employee)}><Eye size={17} /></Button><Button className="h-8 w-8 px-0" variant="ghost" title="ویرایش" aria-label="ویرایش" onClick={() => onEdit(employee)}><Pencil size={16} /></Button><ConfirmDialog title="حذف کارمند" description={`آیا از حذف «${employee.name}» مطمئن هستید؟`} confirmLabel="حذف کارمند" onConfirm={() => onDelete(employee)} trigger={<Button className="h-8 w-8 px-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" variant="ghost" title="حذف" aria-label="حذف"><Trash2 size={16} /></Button>} /></div>;
}

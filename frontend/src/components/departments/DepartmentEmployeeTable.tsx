import { ClipboardPlus, Eye } from "lucide-react";

import { getJobTitleLabel } from "../../lib/employeeLabels";
import type { Employee } from "../../types/api";
import { DataTableShell } from "../shared/DataTableShell";
import { Button } from "../ui/button";

interface DepartmentEmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onObserve: (employee: Employee) => void;
}

export function DepartmentEmployeeTable({ employees, onView, onObserve }: DepartmentEmployeeTableProps) {
  return <>
    <DataTableShell className="hidden lg:block"><table className="data-table"><thead><tr><th>شماره</th><th>اسم</th><th>ولد</th><th>عنوان وظیفه</th><th>عملیات</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td className="text-muted">{employee.id}</td><td className="font-medium text-ink">{employee.name}</td><td className="text-ink">{employee.father_name}</td><td className="text-ink">{getJobTitleLabel(employee.job_title_code)}</td><td><EmployeeActions employee={employee} onView={onView} onObserve={onObserve} /></td></tr>)}</tbody></table></DataTableShell>
    <div className="space-y-3 lg:hidden">{employees.map((employee) => <article key={employee.id} className="rounded-xl border border-line bg-white p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">شمارهٔ ثبت: {employee.id}</p><h2 className="mt-1 font-bold text-ink">{employee.name}</h2><p className="mt-1 text-sm text-muted">ولد: {employee.father_name}</p><p className="mt-2 text-sm text-ink">{getJobTitleLabel(employee.job_title_code)}</p></div><EmployeeActions employee={employee} onView={onView} onObserve={onObserve} /></div></article>)}</div>
  </>;
}

function EmployeeActions({ employee, onView, onObserve }: { employee: Employee; onView: (employee: Employee) => void; onObserve: (employee: Employee) => void }) {
  const canObserve = ["teacher", "amir", "senior_teacher"].includes(employee.job_title_code);
  return <div className="flex flex-wrap items-center gap-1"><Button className="h-9 px-2.5" variant="ghost" onClick={() => onView(employee)}><Eye size={16} />مشاهده جزئیات</Button>{canObserve ? <Button className="h-9 px-2.5" variant="ghost" onClick={() => onObserve(employee)}><ClipboardPlus size={16} />ثبت مشاهده</Button> : null}</div>;
}

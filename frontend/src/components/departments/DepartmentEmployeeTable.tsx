import { ClipboardPlus, Eye } from "lucide-react";

import { getJobTitleLabel } from "../../lib/employeeLabels";
import { canCreateObservation } from "../../lib/observationEligibility";
import type { Employee } from "../../types/api";
import { DataTableCards, DataTableShell, TableColumns } from "../shared/DataTableShell";
import { Button } from "../ui/button";

interface DepartmentEmployeeTableProps {
  employees: Employee[];
  onView: (employee: Employee) => void;
  onObserve: (employee: Employee) => void;
}

export function DepartmentEmployeeTable({ employees, onView, onObserve }: DepartmentEmployeeTableProps) {
  return <>
    <DataTableShell bounded responsive><table className="data-table"><TableColumns widths={[8, 28, 25, 23, 16]} /><thead><tr><th>شماره</th><th>اسم</th><th>ولد</th><th>عنوان وظیفه</th><th>عملیات</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td className="text-muted">{employee.id}</td><td className="font-medium text-ink">{employee.name}</td><td className="text-ink">{employee.father_name}</td><td className="text-ink">{getJobTitleLabel(employee.job_title_code)}</td><td><EmployeeActions employee={employee} onView={onView} onObserve={onObserve} /></td></tr>)}</tbody></table></DataTableShell>
    <DataTableCards>{employees.map((employee) => <article key={employee.id} className="surface-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-muted">شمارهٔ ثبت: {employee.id}</p><h2 className="mt-1 font-bold text-ink">{employee.name}</h2><p className="mt-1 text-sm text-muted">ولد: {employee.father_name}</p><p className="mt-2 text-sm text-ink">{getJobTitleLabel(employee.job_title_code)}</p></div><EmployeeActions employee={employee} onView={onView} onObserve={onObserve} /></div></article>)}</DataTableCards>
  </>;
}

function EmployeeActions({ employee, onView, onObserve }: { employee: Employee; onView: (employee: Employee) => void; onObserve: (employee: Employee) => void }) {
  const canObserve = canCreateObservation(employee.job_title_code);
  return <div className="flex items-center gap-1"><Button className="h-8 w-8 px-0" variant="ghost" title="مشاهده جزئیات" aria-label="مشاهده جزئیات" onClick={() => onView(employee)}><Eye size={16} /></Button>{canObserve ? <Button className="h-8 w-8 px-0" variant="ghost" title="ثبت مشاهده" aria-label="ثبت مشاهده" onClick={() => onObserve(employee)}><ClipboardPlus size={16} /></Button> : null}</div>;
}

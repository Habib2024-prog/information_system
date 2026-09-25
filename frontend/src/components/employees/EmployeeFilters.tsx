import { FilterX } from "lucide-react";

import type { EmployeeFilters as Filters } from "../../api/employees";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { educationLevelOptions, fieldMatchLabels, jobTitleLabels } from "../../lib/employeeLabels";
import type { Department } from "../../types/api";
import { SearchInput } from "../shared/SearchInput";
import { Button } from "../ui/button";

interface EmployeeFiltersProps {
  filters: Filters;
  departments: Department[];
  includeDepartmentFilter?: boolean;
  compact?: boolean;
  onChange: (next: Filters) => void;
  onClear: () => void;
}

export function EmployeeFilters({ filters, departments, includeDepartmentFilter = true, compact = false, onChange, onClear }: EmployeeFiltersProps) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });
  const selectFilters: Array<{
    key: Exclude<keyof Filters, "search" | "school_workplace" | "city_district">;
    label: string;
    options: Record<string, string>;
  }> = [
    { key: "job_title_code", label: "عنوان وظیفه", options: jobTitleLabels },
    { key: "field_match_code", label: "مطابق رشته", options: fieldMatchLabels },
    { key: "education_level", label: "درجه تحصیل", options: Object.fromEntries(educationLevelOptions.map((level) => [level, level])) },
  ];
  if (includeDepartmentFilter) selectFilters.splice(2, 0, { key: "department_id", label: "دیپارتمنت", options: Object.fromEntries(departments.map((department) => [String(department.id), getDepartmentLabel(department.code, department.display_name)])) });

  return <div className={compact ? "rounded-xl border border-line bg-slate-50/80 p-3" : "rounded-xl border border-line bg-white p-4 shadow-soft"}><div className="flex flex-col gap-3 lg:flex-row"><SearchInput className="lg:w-60" value={filters.search} onChange={(event) => set("search", event.target.value)} /><div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{selectFilters.map(({ key, label, options }) => <select key={key} className="h-10 rounded-lg border border-line bg-white px-2 text-sm" value={filters[key]} onChange={(event) => set(key, event.target.value)}><option value="">{label}</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>)}<input className="h-10 rounded-lg border border-line px-2 text-sm" placeholder="محل وظیفه" value={filters.school_workplace} onChange={(event) => set("school_workplace", event.target.value)} /><input className="h-10 rounded-lg border border-line px-2 text-sm" placeholder="شهر / ولسوالی" value={filters.city_district} onChange={(event) => set("city_district", event.target.value)} /></div><Button className="shrink-0" variant="ghost" onClick={onClear}><FilterX size={16} />پاک‌کردن</Button></div></div>;
}

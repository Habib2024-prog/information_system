import type { EmployeeFilters as Filters } from "../../api/employees";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { educationLevelOptions, fieldMatchLabels, jobTitleLabels } from "../../lib/employeeLabels";
import type { Department } from "../../types/api";
import { SearchInput } from "../shared/SearchInput";
import { FilterToolbar } from "../shared/FilterToolbar";

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

  return <FilterToolbar compact={compact} onClear={onClear}><SearchInput className="col-span-2 lg:col-span-1" value={filters.search} onChange={(event) => set("search", event.target.value)} />{selectFilters.map(({ key, label, options }) => <select key={key} className="input" value={filters[key]} onChange={(event) => set(key, event.target.value)}><option value="">{label}</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>)}<input className="input" placeholder="محل وظیفه" value={filters.school_workplace} onChange={(event) => set("school_workplace", event.target.value)} /><input className="input" placeholder="شهر / ولسوالی" value={filters.city_district} onChange={(event) => set("city_district", event.target.value)} /></FilterToolbar>;
}

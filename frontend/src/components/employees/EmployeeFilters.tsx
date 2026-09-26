import type { EmployeeFilters as Filters } from "../../api/employees";
import { getDepartmentLabel } from "../../lib/departmentLabels";
import { educationLevelOptions, fieldMatchLabels, jobTitleLabels } from "../../lib/employeeLabels";
import type { Department } from "../../types/api";
import { FilterToolbar } from "../shared/FilterToolbar";
import { SearchInput } from "../shared/SearchInput";
import { SearchableSelect, type SelectOption } from "../shared/SearchableSelect";

interface EmployeeFiltersProps { filters: Filters; departments: Department[]; includeDepartmentFilter?: boolean; compact?: boolean; onChange: (next: Filters) => void; onClear: () => void; }
const mappedOptions = (allLabel: string, options: Record<string, string>): SelectOption[] => [{ value: "", label: allLabel }, ...Object.entries(options).map(([value, label]) => ({ value, label }))];

export function EmployeeFilters({ filters, departments, includeDepartmentFilter = true, compact = false, onChange, onClear }: EmployeeFiltersProps) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });
  const departmentOptions = [{ value: "", label: "همه دیپارتمنت‌ها" }, ...departments.map((department) => ({ value: String(department.id), label: getDepartmentLabel(department.code, department.display_name) }))];
  const educationOptions = [{ value: "", label: "همه درجه‌ها" }, ...educationLevelOptions.map((value) => ({ value, label: value }))];
  return <FilterToolbar compact={compact} onClear={onClear} advanced={<><SearchableSelect value={filters.field_match_code} onChange={(value) => set("field_match_code", value)} placeholder="مطابق رشته" options={mappedOptions("همه وضعیت‌ها", fieldMatchLabels)} />{includeDepartmentFilter ? <SearchableSelect value={filters.department_id} onChange={(value) => set("department_id", value)} placeholder="دیپارتمنت" options={departmentOptions} /> : null}<input className="input" placeholder="محل وظیفه" value={filters.school_workplace} onChange={(event) => set("school_workplace", event.target.value)} /><input className="input" placeholder="شهر / ولسوالی" value={filters.city_district} onChange={(event) => set("city_district", event.target.value)} /></>}>
    <SearchInput className="col-span-2" value={filters.search} onChange={(event) => set("search", event.target.value)} />
    <SearchableSelect value={filters.job_title_code} onChange={(value) => set("job_title_code", value)} placeholder="عنوان وظیفه" options={mappedOptions("همه عنوان‌ها", jobTitleLabels)} />
    <SearchableSelect value={filters.education_level} onChange={(value) => set("education_level", value)} placeholder="درجه تحصیل" options={educationOptions} />
  </FilterToolbar>;
}

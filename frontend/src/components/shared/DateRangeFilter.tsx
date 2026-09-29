import { cn } from "../../lib/utils";
import { JalaliDateInput } from "./JalaliDateInput";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

/** Values are canonical ISO dates, so range validation and API filtering remain chronological. */
export function isValidDateRange(from: string, to: string) { return !from || !to || from <= to; }

export function DateRangeFilter({ from, to, onFromChange, onToChange, className }: DateRangeFilterProps) {
  const invalid = !isValidDateRange(from, to);
  return <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
    <label className="block"><span className="mb-1 block text-xs font-medium text-muted">از تاریخ</span><JalaliDateInput aria-label="از تاریخ" value={from} onChange={onFromChange} /></label>
    <label className="block"><span className="mb-1 block text-xs font-medium text-muted">تا تاریخ</span><JalaliDateInput aria-label="تا تاریخ" value={to} onChange={onToChange} /></label>
    {invalid ? <p className="sm:col-span-2 text-xs text-rose-700" role="alert">تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.</p> : null}
  </div>;
}

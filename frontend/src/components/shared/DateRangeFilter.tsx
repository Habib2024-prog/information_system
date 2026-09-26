import { cn } from "../../lib/utils";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}

export function isValidDateRange(from: string, to: string) {
  return !from || !to || from <= to;
}

/** Explicit labels keep native date inputs understandable in Dari and RTL layouts. */
export function DateRangeFilter({ from, to, onFromChange, onToChange, className }: DateRangeFilterProps) {
  const invalid = !isValidDateRange(from, to);

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">از تاریخ</span>
        <input aria-label="از تاریخ" className="input" type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">تا تاریخ</span>
        <input aria-label="تا تاریخ" className="input" type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
      </label>
      {invalid ? <p className="sm:col-span-2 text-xs text-rose-700" role="alert">تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.</p> : null}
    </div>
  );
}

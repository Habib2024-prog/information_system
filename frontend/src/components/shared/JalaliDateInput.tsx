import { useEffect, useState } from "react";

import { formatJalaliDate, jalaliInputToIsoDate } from "../../lib/date";
import { cn } from "../../lib/utils";

interface JalaliDateInputProps {
  value: string;
  onChange: (isoDate: string) => void;
  max?: string;
  min?: string;
  className?: string;
  "aria-label": string;
}

/** A Persian/Jalali text date input that emits only canonical ISO calendar dates. */
export function JalaliDateInput({ value, onChange, max, min, className, ...props }: JalaliDateInputProps) {
  const [text, setText] = useState(value ? formatJalaliDate(value) : "");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => { setText(value ? formatJalaliDate(value) : ""); setInvalid(false); }, [value]);

  const change = (next: string) => {
    setText(next);
    if (!next.trim()) { setInvalid(false); onChange(""); return; }
    const isoDate = jalaliInputToIsoDate(next);
    const valid = Boolean(isoDate && (!min || isoDate >= min) && (!max || isoDate <= max));
    setInvalid(!valid);
    if (valid && isoDate) onChange(isoDate);
  };

  return <div>
    <input {...props} className={cn("input tabular-nums", className)} dir="ltr" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۰۶" value={text} onChange={(event) => change(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${props["aria-label"]}-error` : undefined} />
    {invalid ? <p id={`${props["aria-label"]}-error`} className="mt-1 text-xs text-rose-700" role="alert">تاریخ هجری شمسی معتبر وارد کنید.</p> : null}
  </div>;
}

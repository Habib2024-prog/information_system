import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden="true" />
      <input
        className="h-10 w-full rounded-lg border border-line bg-white pr-10 pl-3 text-sm text-ink placeholder:text-slate-400"
        placeholder="جست‌وجو"
        {...props}
      />
    </label>
  );
}

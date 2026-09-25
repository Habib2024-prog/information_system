import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
      <input
        className="input pr-10"
        placeholder="جست‌وجو"
        {...props}
      />
    </label>
  );
}

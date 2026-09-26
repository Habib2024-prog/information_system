import { ChevronDown, Filter, FilterX } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface FilterToolbarProps {
  children: ReactNode;
  advanced?: ReactNode;
  onClear: () => void;
  actions?: ReactNode;
  hasActiveFilters?: boolean;
  activeAdvancedCount?: number;
  compact?: boolean;
  className?: string;
}

/** Shared filter surface: compact primary controls with an optional disclosure for less-used filters. */
export function FilterToolbar({
  children,
  advanced,
  onClear,
  actions,
  hasActiveFilters = true,
  activeAdvancedCount = 0,
  compact = false,
  className,
}: FilterToolbarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return <section className={cn("glass-surface rounded-xl", compact ? "p-3" : "p-3.5 sm:p-4", className)} aria-label="فیلترها">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        {advanced ? <Button className="h-10" variant="secondary" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((value) => !value)}>
          <Filter size={16} />
          {activeAdvancedCount > 0 ? <>فیلترها ({activeAdvancedCount})</> : "فیلترها"}
          <ChevronDown size={15} className={cn("transition-transform", advancedOpen && "rotate-180")} />
        </Button> : null}
        {actions}
        {hasActiveFilters ? <Button className="h-10" variant="ghost" onClick={onClear}><FilterX size={16} />پاک‌کردن فیلترها</Button> : null}
      </div>
    </div>
    {advanced ? <div className={cn("grid overflow-hidden transition-[grid-template-rows,margin] duration-200 motion-reduce:transition-none", advancedOpen ? "mt-3 grid-rows-[1fr]" : "mt-0 grid-rows-[0fr]")}>
      <div className="min-h-0">
        <div className="grid gap-3 border-t border-line/70 pt-3 sm:grid-cols-2 lg:grid-cols-4">{advanced}</div>
      </div>
    </div> : null}
  </section>;
}

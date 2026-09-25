import type { ReactNode } from "react";
import { FilterX } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface FilterToolbarProps {
  children: ReactNode;
  onClear: () => void;
  compact?: boolean;
  className?: string;
}

export function FilterToolbar({ children, onClear, compact = false, className }: FilterToolbarProps) {
  return <div className={cn("rounded-xl border border-line bg-slate-50/80", compact ? "p-3" : "p-4 shadow-soft", className)}><div className="flex flex-col gap-3 lg:flex-row"><div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{children}</div><Button className="shrink-0" variant="ghost" onClick={onClear}><FilterX size={16} />پاک‌کردن</Button></div></div>;
}

import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface DataTableShellProps {
  children: ReactNode;
  className?: string;
}

export function DataTableShell({ children, className }: DataTableShellProps) {
  return <div className={cn("overflow-x-auto rounded-xl border border-line bg-white shadow-soft", className)}>{children}</div>;
}

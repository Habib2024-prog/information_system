import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface DataTableShellProps {
  children: ReactNode;
  className?: string;
  bounded?: boolean;
  responsive?: boolean;
}

// Keep native overscroll behavior: once a table reaches either edge, wheel, trackpad and touch scrolling continues on the page.
const scrollArea = "max-h-[min(60dvh,36rem)] overflow-x-auto overflow-y-auto touch-pan-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function TableColumns({ widths }: { widths: readonly number[] }) {
  return <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>;
}

export function DataTableShell({ children, className, bounded = false, responsive = false }: DataTableShellProps) {
  return <div role={bounded ? "region" : undefined} aria-label={bounded ? "فهرست رکوردها" : undefined} tabIndex={bounded ? 0 : undefined} className={cn("elevated-surface app-scrollbar w-full min-w-0 max-w-full overflow-x-auto rounded-xl", responsive && "app-data-table", bounded && `${scrollArea} [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-[hsl(var(--surface-muted)_/_0.98)]`, className)}>{children}</div>;
}

// Mobile cards use the same single scroll viewport; pagination stays outside it.
export function DataTableCards({ children, className }: Omit<DataTableShellProps, "bounded" | "responsive">) {
  return <div role="region" aria-label="فهرست رکوردها" tabIndex={0} className={cn(scrollArea, "app-scrollbar app-data-cards w-full min-w-0 max-w-full space-y-3 rounded-xl", className)}>{children}</div>;
}

import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
  return <section className={cn("rounded-xl border border-line bg-white p-5 shadow-soft", className)}>{children}</section>;
}

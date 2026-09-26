import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export function SectionCard({ children, className }: SectionCardProps) {
  return <section className={cn("glass-surface rounded-xl p-5", className)}>{children}</section>;
}

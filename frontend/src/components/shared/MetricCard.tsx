import type { LucideIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value?: number;
  isLoading: boolean;
  isUnavailable?: boolean;
}

export function MetricCard({ title, icon: Icon, value, isLoading, isUnavailable = false }: MetricCardProps) {
  const displayValue = isLoading ? "…" : value?.toLocaleString("fa-IR") ?? "—";
  const helperText = isLoading ? "در حال دریافت اطلاعات" : isUnavailable ? "داده در دسترس نیست" : "اطلاعات ثبت‌شده";

  return (
    <SectionCard className="motion-safe-transition group min-h-40 border-t-2 border-t-accent hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          <p className="mt-4 text-4xl font-bold tracking-tight text-ink" aria-live="polite">
            {displayValue}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/10">
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />{helperText}</div>
    </SectionCard>
  );
}

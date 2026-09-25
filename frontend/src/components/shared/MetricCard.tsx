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
    <SectionCard className="motion-safe-transition group min-h-36 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-4 text-3xl font-bold tracking-tight text-ink" aria-live="polite">
            {displayValue}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{helperText}</p>
    </SectionCard>
  );
}

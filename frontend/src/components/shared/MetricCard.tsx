import type { LucideIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value?: number;
  isLoading: boolean;
  isUnavailable?: boolean;
  detail?: string;
  tone?: "indigo" | "cyan" | "emerald" | "amber";
}

const toneStyles = {
  indigo: "border-t-indigo-500 bg-indigo-50/65 text-indigo-700 ring-indigo-600/10",
  cyan: "border-t-cyan-500 bg-cyan-50/65 text-cyan-700 ring-cyan-600/10",
  emerald: "border-t-emerald-500 bg-emerald-50/65 text-emerald-700 ring-emerald-600/10",
  amber: "border-t-amber-500 bg-amber-50/65 text-amber-700 ring-amber-600/10",
};

export function MetricCard({ title, icon: Icon, value, isLoading, isUnavailable = false, detail = "اطلاعات ثبت‌شده", tone = "indigo" }: MetricCardProps) {
  const displayValue = isUnavailable ? "—" : (value ?? 0).toLocaleString("fa-IR");
  const helperText = isUnavailable ? "داده در دسترس نیست" : detail;
  const style = toneStyles[tone];

  return (
    <SectionCard className="motion-safe-transition group min-h-40 border-t-2 hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          {isLoading ? <span className="mt-4 block h-10 w-20 animate-pulse rounded-lg bg-slate-200/80" aria-label="در حال دریافت اطلاعات" /> : (
            <p className="mt-4 text-4xl font-bold tracking-tight text-ink" aria-live="polite">{displayValue}</p>
          )}
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style}`}>
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted"><span className={`h-1.5 w-1.5 rounded-full ${tone === "amber" ? "bg-amber-500" : tone === "emerald" ? "bg-emerald-500" : tone === "cyan" ? "bg-cyan-500" : "bg-indigo-500"}`} aria-hidden="true" />{isLoading ? "در حال دریافت اطلاعات" : helperText}</div>
    </SectionCard>
  );
}

import type { DashboardObservationOverview } from "../../api/dashboard";
import { getFinalResultLabel, getObservationTypeLabel } from "../../lib/observationLabels";
import { EmptyState, ErrorState, LoadingState } from "../shared/states";

interface ObservationOverviewProps {
  items: DashboardObservationOverview[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function ObservationOverview({ items, isLoading, hasError, onRetry }: ObservationOverviewProps) {
  if (isLoading) return <LoadingState title="در حال دریافت مشاهدات" description="خلاصه مشاهدات ثبت‌شده دریافت می‌شود." />;
  if (hasError) return <ErrorState title="دریافت مشاهدات ممکن نشد" description="دوباره تلاش کنید." onRetry={onRetry} />;
  if (!items.some((item) => item.total > 0)) return <EmptyState title="هنوز هیچ مشاهده‌ای ثبت نشده است" description="پس از ثبت مشاهده، خلاصه آن در این بخش نمایش داده می‌شود." />;

  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <section key={item.observation_type} className="rounded-xl border border-line/80 bg-[hsl(var(--surface)_/_0.62)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">{getObservationTypeLabel(item.observation_type)}</h3>
            <span className="status-badge status-badge-info tabular-nums">{item.total.toLocaleString("fa-IR")} مورد</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`سهم ${getObservationTypeLabel(item.observation_type)}`}>
            <div className="h-full rounded-full bg-gradient-to-l from-accent to-cyan transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${Math.round((item.total / total) * 100)}%` }} />
          </div>
          {item.total === 0 ? <p className="mt-3 text-xs text-muted">برای این نوع مشاهده سابقه‌ای ثبت نشده است.</p> : (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {item.results.map((result) => (
                <div key={result.final_result_code ?? "unclassified"} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-slate-50/75 px-3 py-2 text-sm">
                  <dt className="min-w-0 truncate text-muted">{getFinalResultLabel(result.final_result_code, item.observation_type)}</dt>
                  <dd className="font-semibold tabular-nums text-ink">{result.count.toLocaleString("fa-IR")}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}

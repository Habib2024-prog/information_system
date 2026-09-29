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
  if (!items.some((item) => item.total > 0)) return <EmptyState title="مشاهده‌ای ثبت نشده است" description="پس از ثبت مشاهده، خلاصه آن در این بخش نمایش داده می‌شود." />;

  return (
    <div className="divide-y divide-line">
      {items.map((item) => (
        <section key={item.observation_type} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">{getObservationTypeLabel(item.observation_type)}</h3>
            <span className="status-badge status-badge-info tabular-nums">{item.total.toLocaleString("fa-IR")} مورد</span>
          </div>
          {item.total === 0 ? <p className="mt-3 text-xs text-muted">برای این نوع مشاهده سابقه‌ای ثبت نشده است.</p> : (
            <dl className="mt-4 space-y-3">
              {item.results.map((result) => (
                <div key={result.final_result_code ?? "unclassified"} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
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

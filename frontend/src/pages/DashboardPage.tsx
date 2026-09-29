import { ClipboardCheck, GraduationCap, School, UsersRound } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { ObservationOverview } from "../components/dashboard/ObservationOverview";
import { RecentActivities } from "../components/dashboard/RecentActivities";
import { MetricCard } from "../components/shared/MetricCard";
import { ErrorState } from "../components/shared/states";
import { PageHeader } from "../components/shared/PageHeader";
import { SectionCard } from "../components/shared/SectionCard";
import { useDashboardActivities, useDashboardMetrics } from "../hooks/useDashboardMetrics";

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const { summary, isLoading, hasError, reload } = useDashboardMetrics();
  const activity = useDashboardActivities(isAdmin);
  const totals = summary?.totals;

  return (
    <div className="space-y-7">
      <PageHeader
        title="داشبورد"
        description="نمای کلی از اطلاعات ثبت‌شده در سیستم مدیریت معلومات."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="خلاصه اطلاعات">
        <MetricCard title="کارمندان دیپارتمنت" icon={UsersRound} value={totals?.employees} isLoading={isLoading} isUnavailable={hasError} />
        <MetricCard title="اعضای علمی" icon={GraduationCap} value={totals?.scientific_members} isLoading={isLoading} isUnavailable={hasError} />
        <MetricCard title="مکاتب" icon={School} value={totals?.schools} isLoading={isLoading} isUnavailable={hasError} />
        <MetricCard title="مشاهدات" icon={ClipboardCheck} value={totals?.observations} isLoading={isLoading} isUnavailable={hasError} />
      </section>
      {hasError ? (
        <ErrorState title="دریافت آمار ممکن نشد" description="اتصال با سرویس اطلاعات را بررسی کنید." onRetry={reload} />
      ) : null}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
        <SectionCard>
          <h2 className="text-base font-bold text-ink">فعالیت‌های اخیر</h2>
          <p className="mb-5 mt-1 text-sm text-muted">آخرین فعالیت‌های ثبت‌شده، از جدیدترین به قدیمی‌ترین.</p>
          <RecentActivities items={activity.activities} hasAccess={isAdmin} isLoading={activity.isLoading} hasError={activity.hasError} onRetry={activity.reload} />
        </SectionCard>
        <SectionCard>
          <h2 className="text-base font-bold text-ink">نمای کلی مشاهدات</h2>
          <p className="mb-5 mt-1 text-sm text-muted">مشاهدات فعال، براساس نوع مشاهده و نتیجه نهایی ثبت‌شده.</p>
          <ObservationOverview items={summary?.observation_overview ?? []} isLoading={isLoading} hasError={hasError} onRetry={reload} />
        </SectionCard>
      </div>
    </div>
  );
}

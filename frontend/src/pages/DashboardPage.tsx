import { ArrowLeft, ClipboardCheck, GraduationCap, School, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ObservationOverview } from "../components/dashboard/ObservationOverview";
import { RecentActivities } from "../components/dashboard/RecentActivities";
import { MetricCard } from "../components/shared/MetricCard";
import { ErrorState } from "../components/shared/states";
import { SectionCard } from "../components/shared/SectionCard";
import { useDashboardActivities, useDashboardMetrics } from "../hooks/useDashboardMetrics";

export function DashboardPage() {
  const { isAdmin } = useAuth();
  const { summary, isLoading, hasError, reload } = useDashboardMetrics();
  const activity = useDashboardActivities(isAdmin);
  const totals = summary?.totals;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="خلاصه اطلاعات">
        <MetricCard title="کارمندان دیپارتمنت" icon={UsersRound} value={totals?.employees} isLoading={isLoading} isUnavailable={hasError} detail="کارمندان فعال ثبت‌شده" tone="indigo" />
        <MetricCard title="اعضای علمی" icon={GraduationCap} value={totals?.scientific_members} isLoading={isLoading} isUnavailable={hasError} detail="اعضای فعال ثبت‌شده" tone="cyan" />
        <MetricCard title="مکاتب" icon={School} value={totals?.schools} isLoading={isLoading} isUnavailable={hasError} detail="مکاتب فعال ثبت‌شده" tone="emerald" />
        <MetricCard title="مشاهدات" icon={ClipboardCheck} value={totals?.observations} isLoading={isLoading} isUnavailable={hasError} detail="مشاهدات فعال ثبت‌شده" tone="amber" />
      </section>
      {hasError ? (
        <ErrorState title="دریافت آمار ممکن نشد" description="اتصال با سرویس اطلاعات را بررسی کنید." onRetry={reload} />
      ) : null}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-ink">نمای کلی مشاهدات</h2>
              <p className="mt-1 text-sm leading-6 text-muted">مشاهدات فعال، بر اساس نوع مشاهده و نتیجه نهایی ثبت‌شده.</p>
            </div>
            {isLoading ? <span className="h-7 w-16 shrink-0 animate-pulse rounded-full bg-slate-200/80" aria-label="در حال دریافت تعداد مشاهدات" /> : <span className="status-badge status-badge-info shrink-0 tabular-nums">{(totals?.observations ?? 0).toLocaleString("fa-IR")} مورد</span>}
          </div>
          <ObservationOverview items={summary?.observation_overview ?? []} isLoading={isLoading} hasError={hasError} onRetry={reload} />
        </SectionCard>
        <SectionCard className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-ink">فعالیت‌های اخیر</h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-muted">آخرین پنج فعالیت ثبت‌شده، از جدیدترین به قدیمی‌ترین.</p>
          <RecentActivities items={activity.activities} hasAccess={isAdmin} isLoading={activity.isLoading} hasError={activity.hasError} onRetry={activity.reload} />
        </SectionCard>
      </div>
      <SectionCard className="p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">دسترسی سریع</h2>
          <p className="mt-1 text-sm leading-6 text-muted">ورود مستقیم به بخش‌های اصلی مدیریت اطلاعات.</p>
        </div>
        <nav className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="دسترسی سریع">
          {[
            { to: "/employees", label: "کارمندان دیپارتمنت", icon: UsersRound },
            { to: "/scientific-members", label: "اعضای علمی", icon: GraduationCap },
            { to: "/schools", label: "مکاتب", icon: School },
            { to: "/observations", label: "مشاهدات", icon: ClipboardCheck },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="motion-safe-transition group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line/80 bg-[hsl(var(--surface)_/_0.62)] px-4 py-3 text-sm font-semibold text-ink hover:border-indigo-200 hover:bg-indigo-50/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="flex min-w-0 items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Icon size={16} aria-hidden="true" /></span><span className="truncate">{label}</span></span>
              <ArrowLeft className="shrink-0 text-muted transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none" size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </SectionCard>
    </div>
  );
}

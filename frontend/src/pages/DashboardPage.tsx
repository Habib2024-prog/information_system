import { Building2, ClipboardCheck, GraduationCap, School, UsersRound } from "lucide-react";

import { observationCountUnavailable } from "../api/observations";
import { MetricCard } from "../components/shared/MetricCard";
import { EmptyState, ErrorState } from "../components/shared/states";
import { PageHeader } from "../components/shared/PageHeader";
import { SectionCard } from "../components/shared/SectionCard";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";

export function DashboardPage() {
  const { metrics, isLoading, hasError } = useDashboardMetrics();

  return (
    <div className="space-y-7">
      <PageHeader
        title="داشبورد"
        description="نمای کلی از اطلاعات ثبت‌شده در سامانه مدیریت معلومات."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="خلاصه اطلاعات">
        <MetricCard title="تعداد کارمندان" icon={UsersRound} value={metrics.employees} isLoading={isLoading} />
        <MetricCard title="تعداد دیپارتمنت‌ها" icon={Building2} value={metrics.departments} isLoading={isLoading} />
        <MetricCard title="تعداد اعضای علمی" icon={GraduationCap} value={metrics.scientificMembers} isLoading={isLoading} />
        <MetricCard title="تعداد مشاهدات" icon={ClipboardCheck} isLoading={false} isUnavailable={observationCountUnavailable} />
        <MetricCard title="تعداد مکاتب" icon={School} value={metrics.schools} isLoading={isLoading} />
      </section>
      {hasError ? (
        <ErrorState title="برخی اطلاعات در دسترس نیست" description="اتصال با سرویس اطلاعات را بررسی کنید. کارت‌های دارای داده همچنان نمایش داده می‌شوند." />
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard>
          <h2 className="text-base font-bold text-ink">فعالیت‌های اخیر</h2>
          <p className="mt-1 text-sm text-muted">این بخش پس از نهایی‌شدن منبع داده فعالیت‌ها نمایش داده می‌شود.</p>
          <EmptyState className="mt-5" title="فعالیتی برای نمایش نیست" description="داده فعالیت‌های اخیر هنوز به این بخش متصل نشده است." />
        </SectionCard>
        <SectionCard>
          <h2 className="text-base font-bold text-ink">نمای کلی مشاهدات</h2>
          <p className="mt-1 text-sm text-muted">خلاصه مشاهدات در نسخه‌های بعدی، براساس داده‌های واقعی، ارائه می‌شود.</p>
          <EmptyState className="mt-5" title="اطلاعاتی برای نمایش نیست" description="هنوز منبع آماری واحد برای این نمای کلی در دسترس نیست." />
        </SectionCard>
      </div>
    </div>
  );
}

import { CalendarDays, LayoutDashboard } from "lucide-react";

import { formatJalaliDate, getTodayIsoDate } from "../../lib/date";

export function DashboardHeader() {
  return (
    <header className="premium-panel relative overflow-hidden px-5 py-4 sm:px-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-l from-cyan/10 to-transparent" aria-hidden="true" />
      <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-[0_9px_20px_-12px_hsl(var(--primary)_/_0.8)]">
            <LayoutDashboard size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">داشبورد</h1>
            <p className="mt-1 text-sm leading-6 text-muted">نمای کلی اطلاعات و فعالیت‌های سیستم</p>
          </div>
        </div>
        <time dateTime={getTodayIsoDate()} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-line/80 bg-[hsl(var(--surface)_/_0.7)] px-3 py-1.5 text-xs font-medium text-muted">
          <CalendarDays size={15} className="text-accent" aria-hidden="true" />
          {formatJalaliDate(getTodayIsoDate())}
        </time>
      </div>
    </header>
  );
}

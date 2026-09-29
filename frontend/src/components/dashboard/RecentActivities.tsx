import { CircleDot } from "lucide-react";

import { getAuditActionLabel, getAuditEntityLabel } from "../../lib/auditLabels";
import { formatJalaliDateTime } from "../../lib/date";
import type { AuditLog } from "../../types/audit";
import { EmptyState, ErrorState, LoadingState } from "../shared/states";

interface RecentActivitiesProps {
  items: AuditLog[];
  hasAccess: boolean;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function RecentActivities({ items, hasAccess, isLoading, hasError, onRetry }: RecentActivitiesProps) {
  if (!hasAccess) return <EmptyState title="دسترسی ویژه مدیر سیستم" description="سوابق فعالیت‌های سیستم تنها برای مدیر سیستم قابل مشاهده است." />;
  if (isLoading) return <LoadingState title="در حال دریافت فعالیت‌ها" description="آخرین فعالیت‌های ثبت‌شده دریافت می‌شوند." />;
  if (hasError) return <ErrorState title="دریافت فعالیت‌ها ممکن نشد" description="دوباره تلاش کنید." onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState title="فعالیتی برای نمایش نیست" description="هنوز فعالیتی در سیستم ثبت نشده است." />;

  const visibleItems = items.slice(0, 5);
  return <ol aria-label="فعالیت‌های اخیر" tabIndex={0} className="app-scrollbar max-h-72 min-w-0 overflow-y-auto touch-pan-y pe-1">
    {visibleItems.map((item, index) => <li key={item.id} className="relative flex gap-3 py-3 first:pt-0 last:pb-0">
      {index < visibleItems.length - 1 ? <span className="absolute right-[0.7rem] top-8 h-[calc(100%-0.25rem)] w-px bg-line" aria-hidden="true" /> : null}
      <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><CircleDot size={14} /></span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold text-ink">{getAuditActionLabel(item.action)} · {getAuditEntityLabel(item.entity_type)}</p><time dateTime={item.created_at} className="whitespace-nowrap text-xs text-muted">{formatJalaliDateTime(item.created_at)}</time></div>
        <p className="line-clamp-2 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]" title={item.description}>{item.description}</p>
        <p className="truncate text-xs font-medium text-muted" title={item.user.full_name}>{item.user.full_name}</p>
      </div>
    </li>)}
  </ol>;
}

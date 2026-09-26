import { ChevronLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

import { navigationItems } from "./navigation";
import { MobileNavigation } from "./MobileNavigation";

export function AppHeader() {
  const location = useLocation();
  const currentItem = navigationItems.find((item) => item.path === location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/80 bg-white/70 px-4 shadow-[0_8px_24px_-24px_rgb(15_23_42_/_0.38)] backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNavigation />
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden text-muted sm:inline">سیستم مدیریت اطلاعات</span>
          <ChevronLeft className="hidden text-slate-400 sm:block" size={15} aria-hidden="true" />
          <span className="truncate font-medium text-ink">{currentItem?.label ?? "سامانه"}</span>
        </div>
      </div>
      <div className="text-xs text-muted">مدیریت متمرکز معلومات</div>
    </header>
  );
}

import { ChevronLeft, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getNavigationItems } from "./navigation";
import { MobileNavigation } from "./MobileNavigation";
import { useAuth } from "../../auth/AuthContext";
import { getRoleLabel } from "../../lib/authLabels";
import { Button } from "../ui/button";

export function AppHeader() {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const navigationItems = getNavigationItems(isAdmin);
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
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {user ? <div className="min-w-0 text-left">
          <p className="max-w-36 truncate text-sm font-medium sm:max-w-60">{user.full_name}</p>
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
            <bdi dir="ltr" className="max-w-16 truncate sm:max-w-28" title={user.username}>{user.username}</bdi>
            <span aria-hidden="true">·</span><span className="whitespace-nowrap">{getRoleLabel(user.role_code)}</span>
          </div>
        </div> : null}
        <Button variant="ghost" onClick={logout} aria-label="خروج" title="خروج" className="px-2.5"><LogOut size={16} /><span className="hidden sm:inline">خروج</span></Button>
      </div>
    </header>
  );
}

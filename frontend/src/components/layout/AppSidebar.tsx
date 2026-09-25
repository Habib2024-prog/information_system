import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { navigationItems } from "./navigation";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <aside className={cn("fixed inset-y-0 right-0 z-40 hidden border-l border-line bg-white lg:flex lg:flex-col", collapsed ? "w-[84px]" : "w-72", "motion-safe-transition") }>
      <div className="flex h-20 items-center justify-between border-b border-line px-4">
        <div className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="truncate text-sm font-bold text-ink">سیستم مدیریت اطلاعات</p>
          <p className="mt-1 truncate text-xs text-muted">سامانه معلومات دولتی</p>
        </div>
        <Button variant="ghost" className="size-9 shrink-0 px-0" onClick={onToggle} aria-label="تغییر اندازه فهرست">
          {collapsed ? <PanelRightOpen size={19} /> : <PanelRightClose size={19} />}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="ناوبری اصلی">
        {navigationItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            title={collapsed ? label : undefined}
            className={({ isActive }) => cn(
              "motion-safe-transition flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted hover:bg-slate-50 hover:text-ink",
              isActive && "bg-accent-soft text-accent",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={cn("border-t border-line px-4 py-4 text-xs leading-5 text-muted", collapsed && "px-2 text-center") }>
        <span className={collapsed ? "sr-only" : undefined}>نسخه ابتدایی رابط کاربری</span>
        <span className={cn(!collapsed && "sr-only")}>۱</span>
      </div>
    </aside>
  );
}

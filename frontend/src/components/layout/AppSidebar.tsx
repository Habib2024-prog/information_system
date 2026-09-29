import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { getNavigationItems } from "./navigation";
import { useAuth } from "../../auth/AuthContext";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { isAdmin } = useAuth();
  const navigationItems = getNavigationItems(isAdmin);
  return <aside className={cn("fixed inset-y-0 right-0 z-40 hidden overflow-hidden border-l border-slate-500/30 bg-[linear-gradient(180deg,#102A43_0%,#12344D_52%,#164E63_100%)] text-slate-200 shadow-panel lg:flex lg:flex-col", collapsed ? "w-[84px]" : "w-72", "motion-safe-transition")}>
    <div className="flex h-[76px] items-center justify-between border-b border-slate-700/80 px-4">
      <div className={cn("min-w-0", collapsed && "sr-only")}>
        <p className="truncate text-sm font-bold text-white">ریاست معارف بامیان</p>
        <p className="mt-1 truncate text-xs text-slate-400">سیستم مدیریت اطلاعات</p>
      </div>
      <Button variant="ghost" className="size-9 shrink-0 px-0 text-slate-300 hover:bg-white/10 hover:text-white" onClick={onToggle} aria-label="تغییر اندازه فهرست">
        {collapsed ? <PanelRightOpen size={19} /> : <PanelRightClose size={19} />}
      </Button>
    </div>
    <div className={cn("px-4 pt-5 text-[0.68rem] font-semibold tracking-wide text-slate-500", collapsed && "sr-only")}>ناوبری سیستم</div>
    <nav className="app-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="ناوبری اصلی">
      {navigationItems.map(({ icon: Icon, label, path }) => <NavLink key={path} to={path} end={path === "/"} title={collapsed ? label : undefined} className={({ isActive }) => cn(
        "motion-safe-transition group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
        isActive && "bg-white/[0.12] text-white shadow-[inset_3px_0_0_hsl(var(--cyan))]",
        collapsed && "justify-center px-0",
      )}>
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
        <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
      </NavLink>)}
    </nav>
    <div className={cn("border-t border-slate-700/80 px-4 py-4 text-xs leading-5 text-slate-500", collapsed && "px-2 text-center")}>
      <span className={collapsed ? "sr-only" : undefined}>زون تربیه معلم و انکشاف مسلکی</span>
      <span className={cn(!collapsed && "sr-only")}>۱</span>
    </div>
  </aside>;
}

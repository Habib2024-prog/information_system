import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "../ui/button";
import { getNavigationItems } from "./navigation";
import { useAuth } from "../../auth/AuthContext";
import { getRoleLabel } from "../../lib/authLabels";
import { cn } from "../../lib/utils";
import { UserAvatar } from "../shared/UserAvatar";

export function MobileNavigation() {
  const { isAdmin, logout, user } = useAuth();
  const navigationItems = getNavigationItems(isAdmin);
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="size-10 shrink-0 px-0 lg:hidden" aria-label="باز کردن فهرست">
          <Menu size={21} />
        </Button>
      </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px]" />
      <Dialog.Content dir="rtl" className="fixed inset-y-0 right-0 z-50 flex w-[min(85vw,21.25rem)] max-w-full flex-col overflow-hidden border-l border-slate-500/30 bg-[linear-gradient(180deg,#102A43_0%,#12344D_52%,#164E63_100%)] text-slate-200 shadow-panel outline-none">
        <div className="flex h-[4.75rem] shrink-0 items-center justify-between gap-3 border-b border-slate-400/20 px-4">
          <div className="min-w-0 flex-1">
            <Dialog.Title className="truncate text-sm font-bold text-white">ریاست معارف بامیان</Dialog.Title>
            <p className="mt-1 truncate text-xs text-slate-300">سیستم مدیریت اطلاعات</p>
          </div>
          <Dialog.Close asChild>
            <Button variant="ghost" className="size-11 shrink-0 rounded-lg px-0 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="بستن فهرست">
              <X size={20} />
            </Button>
          </Dialog.Close>
        </div>
        <nav className="app-scrollbar mobile-nav-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 touch-pan-y" aria-label="ناوبری موبایل">
          {navigationItems.map(({ icon: Icon, label, path }) => (
            <Dialog.Close key={path} asChild>
              <NavLink
                to={path}
                end={path === "/"}
                className={({ isActive }) => cn(
                  "motion-safe-transition flex min-h-12 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-right text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/80",
                  isActive
                    ? "border border-white/10 bg-white/[0.12] text-white"
                    : "border border-transparent text-slate-200 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </NavLink>
            </Dialog.Close>
          ))}
        </nav>
        <div className="shrink-0 border-t border-slate-400/20 px-4 py-3">
          {user ? (
            <div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl bg-slate-950/10 px-3 py-2.5">
              <UserAvatar user={user} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-300">{getRoleLabel(user.role_code)}</p>
              </div>
            </div>
          ) : null}
          <Dialog.Close asChild>
            <Button variant="ghost" className="min-h-11 w-full justify-start rounded-lg px-3 text-slate-200 hover:bg-white/10 hover:text-white" onClick={logout}>
              <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true"><LogOut size={19} /></span>
              خروج
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
    </Dialog.Root>
  );
}

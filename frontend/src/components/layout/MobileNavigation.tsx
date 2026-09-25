import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "../ui/button";
import { navigationItems } from "./navigation";

export function MobileNavigation() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="size-10 px-0 lg:hidden" aria-label="باز کردن فهرست">
          <Menu size={21} />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,88vw)] flex-col border-l border-line bg-white shadow-panel">
          <div className="flex h-20 items-center justify-between border-b border-line px-5">
            <Dialog.Title className="text-sm font-bold text-ink">سیستم مدیریت اطلاعات</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" className="size-9 px-0" aria-label="بستن فهرست"><X size={19} /></Button>
            </Dialog.Close>
          </div>
          <nav className="space-y-1 p-4" aria-label="ناوبری موبایل">
            {navigationItems.map(({ icon: Icon, label, path }) => (
              <Dialog.Close key={path} asChild>
                <NavLink
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) => `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? "bg-accent-soft text-accent" : "text-muted hover:bg-slate-50 hover:text-ink"}`}
                >
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </NavLink>
              </Dialog.Close>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

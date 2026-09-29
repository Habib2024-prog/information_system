import { useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-background min-h-screen min-w-0 max-w-full text-ink">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <main className={cn("flex min-h-screen min-w-0 max-w-full flex-col", collapsed ? "lg:mr-[84px]" : "lg:mr-72", "motion-safe-transition")}>
        <AppHeader />
        <div className="mx-auto w-full min-w-0 max-w-[1540px] flex-1 p-4 sm:p-6 lg:p-7 xl:p-8 [container-name:app-content] [container-type:inline-size]">{children}</div>
        <footer className="mt-auto border-t border-line/70 bg-[hsl(var(--surface)_/_0.56)] px-4 py-3 text-center text-xs text-muted backdrop-blur-sm sm:px-6 lg:px-8">
          <p dir="ltr">Designed and Developed by <span className="font-semibold text-ink">Mohammad Hussain Khaliqyar</span></p>
        </footer>
      </main>
    </div>
  );
}

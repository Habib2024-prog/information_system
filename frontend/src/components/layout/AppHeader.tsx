import { LogOut } from "lucide-react";
import { useState } from "react";

import { MobileNavigation } from "./MobileNavigation";
import { useAuth } from "../../auth/AuthContext";
import { getRoleLabel } from "../../lib/authLabels";
import { Button } from "../ui/button";
import { ProfilePhotoDialog } from "../shared/ProfilePhotoDialog";
import { UserAvatar } from "../shared/UserAvatar";

export function AppHeader() {
  const { user, logout, refreshUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  return <header className="header-surface sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <MobileNavigation />
      <div className="min-w-0 border-r-2 border-accent pr-3 leading-tight">
        <p className="truncate text-sm font-bold text-ink sm:text-base">ریاست معارف ولایت بامیان</p>
        <p className="mt-1 truncate text-xs font-medium text-muted sm:text-sm">آمریت زون تربیه معلم و انکشاف مسلکی معلمان بامیان</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {user ? <><Button variant="ghost" className="h-10 w-10 shrink-0 rounded-full px-0" onClick={() => setProfileOpen(true)} aria-label="مدیریت تصویر نمایه" title="مدیریت تصویر نمایه"><UserAvatar user={user} size="md" /></Button><div className="hidden min-w-0 rounded-xl border border-line/70 bg-[hsl(var(--surface)_/_0.66)] px-3 py-2 text-left shadow-[0_4px_14px_-12px_rgb(15_23_42_/_0.35)] sm:block"><p className="max-w-36 truncate text-sm font-semibold text-ink lg:max-w-60">{user.full_name}</p><div className="flex items-center justify-end gap-1.5 text-xs text-muted"><bdi dir="ltr" className="max-w-16 truncate lg:max-w-28" title={user.username}>{user.username}</bdi><span aria-hidden="true">·</span><span className="whitespace-nowrap">{getRoleLabel(user.role_code)}</span></div></div><ProfilePhotoDialog user={user} open={profileOpen} onOpenChange={setProfileOpen} onSaved={refreshUser} /></> : null}
      <Button variant="ghost" onClick={logout} aria-label="خروج" title="خروج" className="px-2.5 text-muted hover:text-danger"><LogOut size={17} /><span className="hidden sm:inline">خروج</span></Button>
    </div>
  </header>;
}

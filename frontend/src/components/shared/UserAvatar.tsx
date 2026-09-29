import { UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { apiMediaUrl } from "../../api/client";
import { cn } from "../../lib/utils";

interface AvatarUser {
  full_name: string;
  profile_image_url: string | null;
}

const sizes = {
  sm: "size-8 text-[0.65rem]",
  md: "size-10 text-sm",
  lg: "size-20 text-xl",
} as const;

export function UserAvatar({ user, size = "sm", imageUrl, className }: {
  user: AvatarUser;
  size?: keyof typeof sizes;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const source = imageUrl === undefined ? apiMediaUrl(user.profile_image_url) : imageUrl ?? undefined;
  useEffect(() => setFailed(false), [source]);
  const initials = useMemo(() => user.full_name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "?", [user.full_name]);
  return <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-[linear-gradient(135deg,hsl(var(--primary)_/_0.18),hsl(var(--cyan)_/_0.18))] font-bold text-accent shadow-[0_3px_10px_-6px_rgb(15_23_42_/_0.45)]", sizes[size], className)}>
    {source && !failed ? <img src={source} alt={`تصویر نمایهٔ ${user.full_name}`} className="size-full object-cover" onError={() => setFailed(true)} /> : initials !== "?" ? <span aria-hidden="true">{initials}</span> : <UserRound size={size === "lg" ? 28 : 17} aria-label="کاربر" />}
  </span>;
}

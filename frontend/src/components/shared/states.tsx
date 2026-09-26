import type { LucideIcon } from "lucide-react";
import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface StateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

function StatePanel({ title, description, icon: Icon, className }: StateProps) {
  return (
    <div className={cn("flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-slate-50/70 px-6 text-center", className)}>
      <Icon className="mb-3 text-muted" size={25} strokeWidth={1.6} aria-hidden="true" />
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

export function EmptyState(props: Omit<StateProps, "icon">) {
  return <StatePanel {...props} icon={Inbox} />;
}

export function LoadingState(props: Omit<StateProps, "icon">) {
  return <StatePanel {...props} icon={LoaderCircle} className={cn("[&>svg]:animate-spin", props.className)} />;
}

export function ErrorState({ onRetry, ...props }: Omit<StateProps, "icon"> & { onRetry?: () => void }) {
  return (
    <div className="space-y-3">
      <StatePanel {...props} icon={CircleAlert} />
      {onRetry ? <Button onClick={onRetry}>دوباره تلاش کنید</Button> : null}
    </div>
  );
}

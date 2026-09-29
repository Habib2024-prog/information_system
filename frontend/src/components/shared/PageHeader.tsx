import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-line/90 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-2 h-1 w-10 rounded-full bg-accent/80" aria-hidden="true" />
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-[1.7rem]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

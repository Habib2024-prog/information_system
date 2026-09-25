import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-[hsl(var(--primary-hover))] shadow-soft",
  secondary: "border border-line bg-white text-ink hover:bg-slate-50",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
  danger: "bg-[hsl(var(--danger))] text-white hover:bg-rose-800 shadow-soft",
};

export function Button({ children, className, type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "motion-safe-transition inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

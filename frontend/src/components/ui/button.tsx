import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-[0_7px_14px_-8px_hsl(var(--primary)_/_0.8)] hover:bg-[hsl(var(--primary-hover))]",
  secondary: "border border-line bg-[hsl(var(--surface)_/_0.82)] text-ink shadow-[0_1px_2px_rgb(15_23_42_/_0.03)] hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
  danger: "bg-danger text-white shadow-[0_7px_14px_-8px_hsl(var(--danger)_/_0.75)] hover:bg-rose-600",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ children, className, type = "button", variant = "secondary", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "motion-safe-transition inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

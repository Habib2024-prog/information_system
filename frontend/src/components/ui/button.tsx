import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-[#173f74] shadow-soft",
  secondary: "border border-line bg-white text-ink hover:bg-slate-50",
  ghost: "text-muted hover:bg-slate-100 hover:text-ink",
};

export function Button({ children, className, type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "motion-safe-transition inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

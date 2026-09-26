import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";

type DialogSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<DialogSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-6xl",
};

const DialogMenuContainerContext = createContext<HTMLElement | null>(null);

/** The shared selector uses this container to stay inside Radix's modal interaction layer. */
export function useDialogMenuContainer() {
  return useContext(DialogMenuContainerContext);
}

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  className?: string;
  layer?: "base" | "nested";
}

/** A consistent, RTL-safe dialog shell with a fixed header/footer and scrollable body. */
export function AppDialog({ open, onOpenChange, title, description, children, footer, size = "md", className, layer = "base" }: AppDialogProps) {
  const [contentElement, setContentElement] = useState<HTMLDivElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={layer === "nested" ? "fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-[1px]" : "fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[1px]"} />
        <Dialog.Content ref={setContentElement} className={cn(
          "fixed inset-x-2 bottom-0 mx-auto flex max-h-[calc(100vh-0.75rem)] w-auto flex-col overflow-visible rounded-t-2xl border border-line/80 bg-white/90 shadow-panel backdrop-blur-xl outline-none sm:inset-x-6 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-3rem)] sm:max-h-[calc(100vh-3rem)] sm:-translate-y-1/2 sm:rounded-xl",
          layer === "nested" ? "z-[100]" : "z-[60]",
          sizes[size],
          className,
        )}>
          <DialogMenuContainerContext.Provider value={contentElement}>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/80 bg-white/55 px-5 py-4 backdrop-blur sm:px-6">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold leading-6 text-ink">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm leading-6 text-muted">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="بستن">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line/80 bg-white/80 px-5 py-4 backdrop-blur sm:px-6">{footer}</div> : null}
          </DialogMenuContainerContext.Provider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

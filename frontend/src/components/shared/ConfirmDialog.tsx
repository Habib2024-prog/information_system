import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { Button } from "../ui/button";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed right-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-white p-6 shadow-panel">
          <Dialog.Title className="text-base font-bold text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted">{description}</Dialog.Description>
          <div className="mt-6 flex items-center gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">انصراف</Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

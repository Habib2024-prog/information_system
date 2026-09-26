import { cloneElement, isValidElement, useState, type MouseEvent, type ReactElement, type ReactNode } from "react";

import { AppDialog } from "./AppDialog";
import { Button } from "../ui/button";

interface ConfirmDialogProps { trigger: ReactNode; title: string; description: string; confirmLabel: string; onConfirm: () => void; }

export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const confirm = () => { onConfirm(); setOpen(false); };
  const clickableTrigger = isValidElement(trigger) ? cloneElement(trigger as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>, { onClick: (event: MouseEvent<HTMLElement>) => { trigger.props.onClick?.(event); if (!event.defaultPrevented) setOpen(true); } }) : trigger;
  return <>{clickableTrigger}<AppDialog open={open} onOpenChange={setOpen} size="sm" title={title} description={description} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button><Button variant="danger" onClick={confirm}>{confirmLabel}</Button></>}><p className="text-sm leading-6 text-muted">این عمل قابل بازگردانی فوری نیست.</p></AppDialog></>;
}

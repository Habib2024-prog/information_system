import { Check, ChevronDown, Search, X } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../lib/utils";
import { useDialogMenuContainer } from "./AppDialog";

export interface SelectOption { value: string; label: string; }
type MenuPosition = CSSProperties;

function getPosition(trigger: DOMRect, container: HTMLElement | null, openAbove: boolean): MenuPosition {
  if (!container) return openAbove
    ? { position: "fixed", left: trigger.left, width: trigger.width, bottom: window.innerHeight - trigger.top + 8 }
    : { position: "fixed", left: trigger.left, width: trigger.width, top: trigger.bottom + 8 };
  const host = container.getBoundingClientRect();
  return openAbove
    ? { position: "absolute", left: trigger.left - host.left, width: trigger.width, bottom: host.bottom - trigger.top + 8 }
    : { position: "absolute", left: trigger.left - host.left, width: trigger.width, top: trigger.bottom - host.top + 8 };
}

function useAnchoredMenu(rootRef: RefObject<HTMLElement>, open: boolean, setOpen: (value: boolean) => void) {
  const dialogContainer = useDialogMenuContainer();
  const [position, setPosition] = useState<MenuPosition>({});
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const below = window.innerHeight - trigger.bottom;
      const openAbove = below < 224 && trigger.top > below;
      setPosition(getPosition(trigger, dialogContainer, openAbove));
    };
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target;
      const menuTarget = target instanceof Element && Boolean(target.closest("[data-anchored-select-menu]"));
      if (rootRef.current && !rootRef.current.contains(target as Node) && !menuTarget) setOpen(false);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutside);
    return () => { window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); document.removeEventListener("mousedown", closeOnOutside); };
  }, [dialogContainer, open, rootRef, setOpen]);
  return { position, portalTarget: dialogContainer ?? document.body };
}

function menuKeyDown(event: KeyboardEvent<HTMLInputElement>, close: () => void) {
  if (event.key === "Escape") { event.preventDefault(); close(); }
}

interface SearchableSelectProps { value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder: string; searchPlaceholder?: string; disabled?: boolean; className?: string; }

/** One modal-aware portal select for filters and form fields. */
export function SearchableSelect({ value, options, onChange, placeholder, searchPlaceholder = "جستجو", disabled = false, className }: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { position, portalTarget } = useAnchoredMenu(rootRef, open, setOpen);
  const selected = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => { const normalized = query.trim().toLocaleLowerCase(); return normalized ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)) : options; }, [options, query]);
  const menu = open ? <div data-anchored-select-menu dir="rtl" style={position} className="z-[130] overflow-hidden rounded-lg border border-line bg-white shadow-panel"><div className="border-b border-line p-2"><label className="relative block"><Search size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" /><input autoFocus value={query} onKeyDown={(event) => menuKeyDown(event, () => setOpen(false))} onChange={(event) => setQuery(event.target.value)} className="input h-9 pr-8" placeholder={searchPlaceholder} /></label></div><div className="max-h-52 overflow-y-auto py-1" role="listbox">{visibleOptions.length ? visibleOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm transition hover:bg-accent-soft focus:bg-accent-soft focus:outline-none", option.value === value && "bg-accent-soft text-accent")} onClick={() => { onChange(option.value); setOpen(false); }}><span className="min-w-0 flex-1 truncate">{option.label}</span>{option.value === value ? <Check size={16} className="shrink-0" /> : null}</button>) : <p className="px-3 py-3 text-sm text-muted">نتیجه‌ای یافت نشد</p>}</div></div> : null;
  return <div className={cn("relative", className)} ref={rootRef}><button type="button" disabled={disabled} className="input flex items-center justify-between gap-2 text-right disabled:cursor-not-allowed" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} onClick={() => { setOpen((current) => !current); setQuery(""); }} aria-haspopup="listbox" aria-expanded={open}><span className={cn("truncate", selected ? "text-ink" : "text-muted")}>{selected?.label ?? placeholder}</span><ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} /></button>{menu ? createPortal(menu, portalTarget) : null}</div>;
}

interface MultiSelectProps { values: string[]; options: SelectOption[]; onChange: (values: string[]) => void; placeholder: string; className?: string; }

export function MultiSelect({ values, options, onChange, placeholder, className }: MultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { position, portalTarget } = useAnchoredMenu(rootRef, open, setOpen);
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const visibleOptions = useMemo(() => { const normalized = query.trim().toLocaleLowerCase(); return normalized ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)) : options; }, [options, query]);
  const toggle = (option: SelectOption) => onChange(values.includes(option.value) ? values.filter((item) => item !== option.value) : [...values, option.value]);
  const menu = open ? <div data-anchored-select-menu dir="rtl" style={position} className="z-[130] overflow-hidden rounded-lg border border-line bg-white shadow-panel"><div className="border-b border-line p-2"><label className="relative block"><Search size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" /><input autoFocus className="input h-9 pr-8" placeholder="جستجوی دیپارتمنت" value={query} onKeyDown={(event) => menuKeyDown(event, () => setOpen(false))} onChange={(event) => setQuery(event.target.value)} /></label></div><div className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">{visibleOptions.length ? visibleOptions.map((option) => { const active = values.includes(option.value); return <button key={option.value} type="button" role="option" aria-selected={active} className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-right text-sm transition hover:bg-accent-soft focus:bg-accent-soft focus:outline-none", active && "bg-accent-soft text-accent")} onClick={() => toggle(option)}><span className="min-w-0 flex-1 truncate">{option.label}</span>{active ? <Check size={16} /> : <span className="h-4 w-4 rounded border border-line" />}</button>; }) : <p className="px-3 py-3 text-sm text-muted">نتیجه‌ای یافت نشد</p>}</div></div> : null;
  return <div className={cn("relative", className)} ref={rootRef}><div className="input flex min-h-10 h-auto flex-wrap items-center gap-1.5 py-1.5 pr-2">{selectedOptions.map((option) => <button key={option.value} type="button" className="inline-flex max-w-full items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30" aria-label={`حذف ${option.label}`} onClick={() => onChange(values.filter((item) => item !== option.value))}><span className="max-w-36 truncate">{option.label}</span><X size={13} className="shrink-0" /></button>)}<button type="button" className="flex min-w-24 flex-1 items-center justify-between gap-2 py-1 text-right text-sm outline-none" onClick={() => { setOpen((current) => !current); setQuery(""); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} aria-haspopup="listbox" aria-expanded={open}><span className="truncate text-muted">{selectedOptions.length ? "افزودن دیپارتمنت" : placeholder}</span><ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} /></button></div>{menu ? createPortal(menu, portalTarget) : null}</div>;
}

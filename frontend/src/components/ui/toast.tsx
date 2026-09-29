import { CircleCheck, CircleX } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
const ToastContext = createContext<{ showToast: (message: string, kind?: Toast["kind"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-5 left-4 z-[70] w-[min(24rem,calc(100vw-2rem))] space-y-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className="elevated-surface flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium leading-6 text-ink"><span className={toast.kind === "success" ? "mt-0.5 text-emerald-600" : "mt-0.5 text-rose-600"}>{toast.kind === "success" ? <CircleCheck size={19} /> : <CircleX size={19} />}</span><span className="min-w-0">{toast.message}</span></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("ToastProvider is required.");
  return context;
}

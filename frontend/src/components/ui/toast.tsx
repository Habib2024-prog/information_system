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
  return <ToastContext.Provider value={value}>{children}<div className="fixed bottom-5 left-5 z-[60] space-y-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm shadow-panel"><span className={toast.kind === "success" ? "text-emerald-700" : "text-rose-700"}>{toast.kind === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}</span>{toast.message}</div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("ToastProvider is required.");
  return context;
}

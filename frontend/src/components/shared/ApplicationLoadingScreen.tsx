import { LoaderCircle, ShieldCheck } from "lucide-react";

export function ApplicationLoadingScreen() {
  return (
    <main className="app-background flex min-h-screen items-center justify-center p-5" dir="rtl" aria-live="polite" aria-busy="true">
      <section className="premium-panel flex w-full max-w-sm flex-col items-center px-7 py-9 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--cyan)))] text-white shadow-[0_14px_26px_-16px_hsl(var(--primary)_/_0.8)]">
          <ShieldCheck size={27} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="mt-5 flex size-8 items-center justify-center text-accent"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={27} strokeWidth={1.8} aria-hidden="true" /></span>
        <h1 className="mt-4 text-base font-bold text-ink">در حال آماده‌سازی سیستم...</h1>
        <p className="mt-2 text-sm leading-6 text-muted">لطفاً چند لحظه منتظر بمانید.</p>
      </section>
    </main>
  );
}

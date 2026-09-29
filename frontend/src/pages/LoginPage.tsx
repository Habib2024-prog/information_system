import { Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import { SessionGate } from "../routes/ProtectedRoute";

export function LoginPage() {
  const { login, isAuthenticated, loading, error: sessionError } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState(false);
  if (isAuthenticated) return <Navigate to="/" replace />;
  if ((loading && !submitting) || sessionError) return <SessionGate />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setValidation(true);
    if (!username.trim() || !password) return;
    setSubmitting(true); setError("");
    try { await login(username.trim(), password); navigate("/", { replace: true }); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "ورود ممکن نشد. لطفاً دوباره تلاش کنید."); }
    finally { setPassword(""); setSubmitting(false); }
  };

  return <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-950 px-4 py-16" dir="rtl">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(79,70,229,0.32),transparent_30rem),radial-gradient(circle_at_5%_80%,rgba(6,182,212,0.16),transparent_26rem)]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.05] to-transparent" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_50%,#eef2ff_50%,#ecfeff_100%)] shadow-[0_32px_90px_-38px_rgba(15,23,42,0.8)] lg:grid-cols-[1.05fr_0.95fr]" aria-labelledby="login-title">
      <div className="relative hidden min-w-0 flex-col justify-between bg-[linear-gradient(145deg,#0f172a_0%,#1e1b4b_62%,#312e81_100%)] p-10 text-white lg:flex">
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><ShieldCheck size={25} className="text-cyan" /></div>
          <p className="mt-8 text-sm font-semibold text-cyan">ریاست معارف ولایت بامیان</p>
          <h2 className="mt-3 max-w-md text-3xl font-bold leading-[1.65]">سیستم امن مدیریت معلومات آموزشی و مسلکی</h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">دسترسی منظم، دقیق و قابل اعتماد به اطلاعات کارمندان، مکاتب و مشاهدات آموزشی.</p>
        </div>
        <p className="text-xs leading-6 text-slate-400">آمریت زون تربیه معلم و انکشاف مسلکی معلمان بامیان</p>
      </div>
      <div className="login-light-gradient min-w-0 p-6 sm:p-9 lg:p-10">
        <div className="mb-7 flex items-center gap-3 lg:hidden"><span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><LockKeyhole size={21} /></span><p className="text-sm font-bold text-ink">ریاست معارف ولایت بامیان</p></div>
        <div className="mb-7">
          <p className="text-sm font-semibold text-accent">ورود به سیستم</p>
          <h1 id="login-title" className="mt-2 text-xl font-bold leading-8 text-ink sm:text-2xl">دیتابیس اطلاعاتی زون تربیه معلم و انکشاف مسلکی معلمان بامیان</h1>
          <p className="mt-3 text-sm leading-6 text-muted">برای ادامه، نام کاربری و رمز عبور خود را وارد کنید.</p>
        </div>
        <form className="space-y-5" noValidate onSubmit={submit}>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">نام کاربری</span>
            <input className="input h-11" dir="auto" name="username" autoComplete="username" autoFocus value={username} disabled={submitting} onChange={(event) => setUsername(event.target.value)} aria-invalid={validation && !username.trim()} />
            {validation && !username.trim() ? <span className="mt-1.5 block text-xs font-medium text-danger">نام کاربری را وارد کنید.</span> : null}
          </label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">رمز عبور</span>
            <span className="relative block"><input className="input h-11 pl-11" dir="ltr" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} disabled={submitting} onChange={(event) => setPassword(event.target.value)} aria-invalid={validation && !password} />
              <button type="button" className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-white/55 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
            {validation && !password ? <span className="mt-1.5 block text-xs font-medium text-danger">رمز عبور را وارد کنید.</span> : null}
          </label>
          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-700" role="alert">{error}</p> : null}
          <Button className="h-11 w-full" type="submit" variant="primary" disabled={submitting}><LogIn size={17} />{submitting ? "در حال ورود" : "ورود به سیستم"}</Button>
        </form>
      </div>
    </section>
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 px-4 py-5 text-center text-xs text-slate-300" dir="ltr">
      Designed and Developed by <span className="font-semibold text-white">Mohammad Hussain Khaliqyar</span>
    </footer>
  </main>;
}

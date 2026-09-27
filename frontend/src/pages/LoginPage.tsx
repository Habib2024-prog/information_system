import { LockKeyhole, LogIn } from "lucide-react";
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
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "ورود ممکن نشد. اتصال به سیستم را بررسی کنید."); }
    finally { setPassword(""); setSubmitting(false); }
  };
  return <main className="flex min-h-screen items-center justify-center px-4 py-8" dir="rtl">
    <section className="glass-surface w-full max-w-md rounded-2xl p-6 sm:p-8" aria-labelledby="login-title">
      <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><LockKeyhole size={22} /></div>
      <p className="text-sm text-muted">سیستم مدیریت اطلاعات دولتی</p>
      <h1 id="login-title" className="mt-2 text-2xl font-semibold text-ink">ورود به سیستم</h1>
      <p className="mt-2 text-sm leading-6 text-muted">برای دسترسی به معلومات، وارد حساب خود شوید.</p>
      <form className="mt-7 space-y-5" noValidate onSubmit={submit}>
        <label className="block"><span className="mb-2 block text-sm font-medium">نام کاربری</span>
          <input className="input" dir="auto" name="username" autoComplete="username" autoFocus value={username} disabled={submitting} onChange={(event) => setUsername(event.target.value)} aria-invalid={validation && !username.trim()} />
          {validation && !username.trim() ? <span className="mt-1 block text-xs text-[hsl(var(--danger))]">نام کاربری را وارد کنید.</span> : null}
        </label>
        <label className="block"><span className="mb-2 block text-sm font-medium">رمز عبور</span>
          <input className="input" dir="ltr" name="password" type="password" autoComplete="current-password" value={password} disabled={submitting} onChange={(event) => setPassword(event.target.value)} aria-invalid={validation && !password} />
          {validation && !password ? <span className="mt-1 block text-xs text-[hsl(var(--danger))]">رمز عبور را وارد کنید.</span> : null}
        </label>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-[hsl(var(--danger))]" role="alert">{error}</p> : null}
        <Button className="w-full" type="submit" variant="primary" disabled={submitting}><LogIn size={16} />{submitting ? "در حال ورود" : "ورود"}</Button>
      </form>
    </section>
  </main>;
}

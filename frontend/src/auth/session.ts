// Tab-scoped persistence only; roles always come from /auth/me, not storage.
// Browser-readable bearer tokens remain sensitive to XSS; never log them.
const storageKey = "government-system.access-token";
const listeners = new Set<() => void>();
let token: string | null = null;
let revision = 0;
try { token = sessionStorage.getItem(storageKey); } catch { /* In-memory fallback. */ }
export const getAccessToken = () => token;
export const getSessionRevision = () => revision;
export function setAccessToken(value: string | null) {
  token = value;
  revision += 1;
  try { if (value) sessionStorage.setItem(storageKey, value); else sessionStorage.removeItem(storageKey); }
  catch { /* Storage may be disabled; the current session still works. */ }
  listeners.forEach((listener) => listener());
}
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

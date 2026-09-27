import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getCurrentUser, loginRequest } from "../api/auth";
import { ApiError } from "../api/client";
import type { CurrentUser } from "../types/auth";
import { getAccessToken, getSessionRevision, setAccessToken, subscribeSession } from "./session";

interface AuthState {
  user: CurrentUser | null; token: string | null; loading: boolean; error: string;
  isAuthenticated: boolean; isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState(getAccessToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loginAttempt = useRef(0);
  const logout = useCallback(() => {
    loginAttempt.current += 1;
    setAccessToken(null); setUser(null); setError(""); setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) { setLoading(false); return; }
    const revision = getSessionRevision();
    try {
      const current = await getCurrentUser();
      if (revision !== getSessionRevision()) return;
      if (!current.is_active) { logout(); return; }
      setUser(current); setError("");
    } catch (cause) {
      if (revision !== getSessionRevision()) return;
      if (cause instanceof ApiError && cause.status === 401) logout();
      else setError("بررسی نشست کاربری ممکن نشد. اتصال به سیستم را بررسی کنید.");
    } finally { if (revision === getSessionRevision()) setLoading(false); }
  }, [logout]);

  useEffect(() => {
    const unsubscribe = subscribeSession(() => {
      const currentToken = getAccessToken(); setToken(currentToken);
      if (!currentToken) { setUser(null); setLoading(false); setError(""); }
    });
    void refreshUser();
    return unsubscribe;
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    const verify = () => { void refreshUser(); };
    window.addEventListener("focus", verify);
    return () => window.removeEventListener("focus", verify);
  }, [user, refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    const attempt = ++loginAttempt.current;
    const response = await loginRequest(username, password);
    if (attempt !== loginAttempt.current) return;
    setLoading(true); setUser(null); setError("");
    setAccessToken(response.access_token);
    const revision = getSessionRevision();
    try {
      const current = await getCurrentUser();
      if (revision !== getSessionRevision() || attempt !== loginAttempt.current) return;
      if (!current.is_active) throw new ApiError("این حساب فعال نیست.", 401);
      setUser(current);
    } catch (cause) {
      if (revision === getSessionRevision()) logout();
      throw cause;
    } finally { setLoading(false); }
  }, [logout]);

  const value = useMemo(() => ({ user, token, loading, error, isAuthenticated: Boolean(user && token), isAdmin: user?.role_code === "admin", login, logout, refreshUser }), [user, token, loading, error, login, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required.");
  return context;
}

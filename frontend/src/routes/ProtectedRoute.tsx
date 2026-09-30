import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApplicationLoadingScreen } from "../components/shared/ApplicationLoadingScreen";
import { EmptyState, ErrorState } from "../components/shared/states";
import { Button } from "../components/ui/button";

export function SessionGate() {
  const { loading, error, logout, refreshUser } = useAuth();
  if (loading) return <ApplicationLoadingScreen />;
  return <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-5" dir="rtl">
    <><ErrorState title="اتصال به سیستم ممکن نشد" description={error} onRetry={() => void refreshUser()} /><Button onClick={logout}>بازگشت به ورود</Button></>
  </div>;
}
export function ProtectedRoute() {
  const { loading, error, isAuthenticated } = useAuth();
  if (loading || error) return <SessionGate />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
export function AdminRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <EmptyState title="دسترسی محدود" description="این بخش فقط برای مدیر سیستم در دسترس است." />;
}

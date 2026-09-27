import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "../components/shared/states";
import { Button } from "../components/ui/button";

export function SessionGate() {
  const { loading, error, logout, refreshUser } = useAuth();
  return <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-5" dir="rtl">
    {loading ? <LoadingState title="در حال بررسی نشست" description="لطفاً کمی منتظر بمانید." /> : <><ErrorState title="اتصال به سیستم ممکن نشد" description={error} onRetry={() => void refreshUser()} /><Button onClick={logout}>بازگشت به ورود</Button></>}
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

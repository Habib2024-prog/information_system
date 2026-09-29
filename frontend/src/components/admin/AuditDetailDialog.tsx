import { useEffect, useState } from "react";
import { getAuditLog } from "../../api/auditLogs";
import { ApiError } from "../../api/client";
import type { AuditLog } from "../../types/audit";
import { AuditDetailContent } from "./AuditDetailContent";
import { AppDialog } from "../shared/AppDialog";
import { ErrorState, LoadingState } from "../shared/states";
import { Button } from "../ui/button";

export function AuditDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const [data, setData] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    if (id === null) return;
    setLoading(true);
    getAuditLog(id).then((record) => { if (active) setData(record); }).catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "دریافت جزئیات ممکن نشد."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reload]);
  return <AppDialog open={id !== null} onOpenChange={(open) => { if (!open) onClose(); }} title="جزئیات فعالیت" description="انجام‌دهنده، رکورد مربوطه و تغییرات ثبت‌شده" size="lg" className="sm:max-h-[85vh]" footer={<Button variant="secondary" onClick={onClose}>بستن</Button>}>
    {loading || (!error && data?.id !== id) ? <LoadingState title="در حال دریافت جزئیات" description="لطفاً کمی منتظر بمانید." /> : error ? <ErrorState title="دریافت جزئیات ممکن نشد" description={error} onRetry={() => setReload((value) => value + 1)} /> : data ? <AuditDetailContent record={data} /> : <ErrorState title="اطلاعات در دسترس نیست" description="دوباره تلاش کنید." />}
  </AppDialog>;
}

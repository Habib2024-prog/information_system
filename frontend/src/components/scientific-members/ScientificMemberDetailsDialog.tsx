import { getDepartmentLabel } from "../../lib/departmentLabels";
import type { ScientificMember } from "../../types/api";
import { AppDialog } from "../shared/AppDialog";
import { Button } from "../ui/button";

export function ScientificMemberDetailsDialog({ member, onOpenChange }: { member: ScientificMember | null; onOpenChange: (open: boolean) => void }) {
  return <AppDialog open={Boolean(member)} onOpenChange={onOpenChange} size="md" title="جزئیات عضو علمی" description={member ? `شمارهٔ ثبت: ${member.id.toLocaleString("fa-AF")}` : ""} footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>بستن</Button>}>
    {member ? <dl className="grid gap-3 sm:grid-cols-2"><Info label="اسم" value={member.name} /><Info label="تخلص" value={member.surname} /><Info label="ولد" value={member.father_name} /><Info label="شماره تماس" value={member.phone_number} ltr /><Info label="رتبه علمی" value={member.academic_rank} /><Info label="دیپارتمنت" value={getDepartmentLabel(member.department.code, member.department.display_name)} /><Info label="تعداد مشاهدات" value={member.observation_count.toLocaleString("fa-AF")} /><Info label="ملاحظات" value={member.notes || "—"} wide /></dl> : null}
  </AppDialog>;
}
function Info({ label, value, wide = false, ltr = false }: { label: string; value: string; wide?: boolean; ltr?: boolean }) { return <div className={`rounded-lg border border-line bg-slate-50/70 px-3 py-2.5 ${wide ? "sm:col-span-2" : ""}`}><dt className="text-xs text-muted">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{value}</dd></div>; }

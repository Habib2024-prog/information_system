import type { AmirObservationDetail, TeacherObservationDetail } from "../../api/observations";
import { getJobTitleLabel } from "../../lib/employeeLabels";
import { formatAmirCompetency, formatTeacherCompetency, getFinalResultLabel } from "../../lib/observationLabels";
import { AppDialog } from "../shared/AppDialog";
import { ErrorState, LoadingState } from "../shared/states";
import { Button } from "../ui/button";

export type ObservationDetailKind = "teacher" | "amir_senior_teacher";

export interface ObservationIdentity {
  employeeName: string;
  fatherName: string;
  workplace?: string;
  jobTitleCode?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ObservationDetailKind;
  identity: ObservationIdentity | null;
  data: TeacherObservationDetail | AmirObservationDetail | null;
  loading?: boolean;
  error?: string;
}

export function ObservationDetailDialog({ open, onOpenChange, kind, identity, data, loading = false, error = "" }: Props) {
  const isTeacher = kind === "teacher";
  const competencies = data ? isTeacher
    ? [
      ["دانش مضمونی", formatTeacherCompetency(Number((data as TeacherObservationDetail).subject_knowledge_score))],
      ["پلان درسی", formatTeacherCompetency(Number((data as TeacherObservationDetail).lesson_plan_score))],
      ["مدیریت صنف", formatTeacherCompetency(Number((data as TeacherObservationDetail).classroom_management_score))],
      ["ارزیابی", formatTeacherCompetency(Number((data as TeacherObservationDetail).assessment_score))],
      ["آموزش‌های مسلکی", formatTeacherCompetency(Number((data as TeacherObservationDetail).professional_learning_score))],
      ["ارتباط با اجتماع", formatTeacherCompetency(Number((data as TeacherObservationDetail).community_engagement_score))],
    ]
    : [
      ["مسوولیت پذیری", formatAmirCompetency(Number((data as AmirObservationDetail).responsibility_score))],
      ["رهبری مسلکی", formatAmirCompetency(Number((data as AmirObservationDetail).professional_leadership_score))],
      ["روابط با جامعه", formatAmirCompetency(Number((data as AmirObservationDetail).community_relations_score))],
      ["انکشاف مسلکی", formatAmirCompetency(Number((data as AmirObservationDetail).professional_development_score))],
    ] : [];

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} layer="nested" size="lg" title="جزئیات مشاهده" description={isTeacher ? "ارزیابی معلم" : "ارزیابی آمر یا سرمعلم"} footer={<Button variant="secondary" onClick={() => onOpenChange(false)}>بستن</Button>}>
      {loading ? <LoadingState title="در حال دریافت جزئیات مشاهده" description="لطفاً چند لحظه صبر کنید." /> : error ? <ErrorState title="دریافت جزئیات ممکن نشد" description={error} /> : data && identity ? <div className="space-y-6">
        <section className="grid gap-3 rounded-xl border border-line bg-slate-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="کارمند" value={identity.employeeName} />
          <Detail label="ولد" value={identity.fatherName} />
          {identity.workplace ? <Detail label="محل وظیفه" value={identity.workplace} /> : null}
          {identity.jobTitleCode ? <Detail label="عنوان وظیفه" value={getJobTitleLabel(identity.jobTitleCode)} /> : null}
          <Detail label="تاریخ مشاهده" value={data.observation_date} ltr />
          <Detail label="صنف مشاهده شده" value={data.observed_class} />
          <Detail label="مضمون" value={data.subject} />
          <Detail label="مشاهده‌کننده" value={`${data.observer.name} ${data.observer.surname}`} />
          <Detail label="مجموع نمره" value={Number(data.total_score).toFixed(2)} ltr />
          <Detail label="نتیجه نهایی" value={getFinalResultLabel(data.final_result_code, kind)} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-ink">قابلیت‌ها</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{competencies.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <Detail label="نکات قوت" value={data.strengths || "—"} />
          <Detail label="نکات قابل اصلاح" value={data.improvements || "—"} />
          <Detail label="ملاحظات" value={data.notes || "—"} />
        </section>
      </div> : <ErrorState title="جزئیات مشاهده در دسترس نیست" description="لطفاً دوباره تلاش کنید." />}
    </AppDialog>
  );
}

function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="rounded-lg border border-line bg-white px-3 py-2.5"><dt className="text-xs text-muted">{label}</dt><dd dir={ltr ? "ltr" : undefined} className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{value}</dd></div>;
}

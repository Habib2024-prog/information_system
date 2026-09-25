from fastapi import Response
from sqlalchemy.orm import Session

from app.common.amir_competency_levels import format_amir_competency
from app.common.amir_observation_results import get_amir_final_result_display_label
from app.common.employee_codes import (
    get_field_match_display_label,
    get_job_title_display_label,
)
from app.common.excel import add_worksheet, build_workbook, workbook_download_response
from app.common.teacher_observation_results import get_teacher_final_result_display_label
from app.common.teacher_competency_levels import format_teacher_competency
from app.repositories.amir_observation_repository import AmirObservationFilters
from app.repositories.employee_repository import EmployeeFilters
from app.repositories.school_repository import SchoolFilters
from app.repositories.scientific_member_repository import ScientificMemberFilters
from app.repositories.teacher_observation_repository import TeacherObservationFilters
from app.schemas.employee import EmployeeRead
from app.schemas.school import SchoolRead
from app.schemas.scientific_member import ScientificMemberRead
from app.services.employee_service import EmployeeService
from app.services.amir_observation_service import AmirObservationService
from app.services.school_service import SchoolService
from app.services.scientific_member_service import ScientificMemberService
from app.services.teacher_observation_service import TeacherObservationService


class ExcelExportService:
    def __init__(
        self,
        employee_service: EmployeeService | None = None,
        school_service: SchoolService | None = None,
        scientific_member_service: ScientificMemberService | None = None,
        teacher_observation_service: TeacherObservationService | None = None,
        amir_observation_service: AmirObservationService | None = None,
    ) -> None:
        self.employee_service = employee_service or EmployeeService()
        self.school_service = school_service or SchoolService()
        self.scientific_member_service = scientific_member_service or ScientificMemberService()
        self.teacher_observation_service = teacher_observation_service or TeacherObservationService()
        self.amir_observation_service = amir_observation_service or AmirObservationService()

    def export_employees(
        self,
        db: Session,
        *,
        filters: EmployeeFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        employees = self.employee_service.list_employees_for_export(
            db,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return self._employee_response(employees, filename="employees.xlsx")

    def export_department_employees(
        self,
        db: Session,
        *,
        department_id: int,
        filters: EmployeeFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        employees = self.employee_service.list_department_employees_for_export(
            db,
            department_id=department_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return self._employee_response(
            employees,
            filename=f"department_{department_id}_employees.xlsx",
        )

    def export_schools(
        self,
        db: Session,
        *,
        filters: SchoolFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        grade_column_indexes = set(range(17, 29))
        workbook = build_workbook(
            worksheet_title="مکاتب",
            headers=_school_headers(),
            rows=(_school_row(school) for school in self.school_service.list_schools_for_export(
                db,
                filters=filters,
                sort_by=sort_by,
                sort_order=sort_order,
            )),
            wrap_text_columns={15, 16, *grade_column_indexes},
            text_columns={3, 6},
        )
        worksheet = workbook.active
        for column_index in grade_column_indexes:
            worksheet.column_dimensions[worksheet.cell(row=1, column=column_index).column_letter].width = 18
        for row_index in range(2, worksheet.max_row + 1):
            worksheet.row_dimensions[row_index].height = 60
        return workbook_download_response(workbook, "schools.xlsx")

    def export_scientific_members(
        self,
        db: Session,
        *,
        filters: ScientificMemberFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        workbook = build_workbook(
            worksheet_title="اعضای علمی",
            headers=_scientific_member_headers(),
            rows=(
                _scientific_member_row(member)
                for member in self.scientific_member_service.list_members_for_export(
                    db,
                    filters=filters,
                    sort_by=sort_by,
                    sort_order=sort_order,
                )
            ),
            wrap_text_columns={9},
            text_columns={5},
        )
        return workbook_download_response(workbook, "scientific_members.xlsx")

    def export_teacher_observations(
        self,
        db: Session,
        *,
        employee_id: int | None,
        filters: TeacherObservationFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        observations = self.teacher_observation_service.list_observations_for_export(
            db,
            employee_id=employee_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        workbook = build_workbook(
            worksheet_title="مشاهدات معلمین",
            headers=_teacher_observation_headers(),
            rows=(_teacher_observation_row(*observation) for observation in observations),
            wrap_text_columns={7, 8, 18, 19, 20},
        )
        return workbook_download_response(workbook, "teacher_observations.xlsx")

    def export_amir_observations(
        self,
        db: Session,
        *,
        employee_id: int | None,
        filters: AmirObservationFilters,
        sort_by: str,
        sort_order: str,
    ) -> Response:
        observations = self.amir_observation_service.list_observations_for_export(
            db,
            employee_id=employee_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        workbook = build_workbook(
            worksheet_title="مشاهدات آمر و سرمعلم",
            headers=_amir_observation_headers(),
            rows=(_amir_observation_row(*observation) for observation in observations),
            wrap_text_columns={7, 8, 16, 17, 18},
        )
        return workbook_download_response(
            workbook,
            "amir_senior_teacher_observations.xlsx",
        )

    def export_scientific_member_observation_history(
        self,
        db: Session,
        *,
        scientific_member_id: int,
    ) -> Response:
        self.scientific_member_service.get_member(db, scientific_member_id)
        teacher_observations = self.teacher_observation_service.list_observations_for_export(
            db,
            employee_id=None,
            filters=TeacherObservationFilters(
                observer_scientific_member_id=scientific_member_id,
            ),
            sort_by="id",
            sort_order="asc",
        )
        amir_observations = self.amir_observation_service.list_observations_for_export(
            db,
            employee_id=None,
            filters=AmirObservationFilters(
                observer_scientific_member_id=scientific_member_id,
            ),
            sort_by="id",
            sort_order="asc",
        )
        workbook = build_workbook(
            worksheet_title="مشاهدات معلمین",
            headers=_teacher_observation_headers(),
            rows=(_teacher_observation_row(*observation) for observation in teacher_observations),
            wrap_text_columns={7, 8, 18, 19, 20},
        )
        add_worksheet(
            workbook,
            worksheet_title="مشاهدات آمر و سرمعلم",
            headers=_amir_observation_headers(),
            rows=(_amir_observation_row(*observation) for observation in amir_observations),
            wrap_text_columns={7, 8, 16, 17, 18},
        )
        return workbook_download_response(
            workbook,
            f"scientific_member_{scientific_member_id}_observations.xlsx",
        )

    @staticmethod
    def _employee_response(employees: list[EmployeeRead], *, filename: str) -> Response:
        workbook = build_workbook(
            worksheet_title="کارمندان",
            headers=_employee_headers(),
            rows=(_employee_row(employee) for employee in employees),
            wrap_text_columns={10, 17, 18},
            text_columns={7},
        )
        return workbook_download_response(workbook, filename)


def _employee_headers() -> list[str]:
    return [
        "شماره",
        "اسم",
        "ولد",
        "ولدیت",
        "مکتب / محل وظیفه",
        "شهر / ولسوالی",
        "شماره تماس",
        "رشته تحصیلی",
        "درجه تحصیل",
        "مضامین که تدریس می‌کند",
        "عنوان وظیفه",
        "سابقه تدریس",
        "بست",
        "قدم",
        "ارزیابی موفق",
        "مطابق رشته",
        "دیپارتمنت مربوطه",
        "ملاحظات",
    ]


def _scientific_member_headers() -> list[str]:
    return [
        "شماره",
        "اسم",
        "تخلص",
        "ولد",
        "شماره تماس",
        "رتبه علمی",
        "دیپارتمنت",
        "تعداد مشاهدات",
        "ملاحظات",
    ]


def _scientific_member_row(member: ScientificMemberRead) -> list[object | None]:
    return [
        member.id,
        member.name,
        member.surname,
        member.father_name,
        member.phone_number,
        member.academic_rank,
        member.department.display_name,
        member.observation_count,
        member.notes,
    ]


def _teacher_observation_headers() -> list[str]:
    return [
        "شماره",
        "اسم کارمند",
        "ولد",
        "محل وظیفه / مکتب",
        "عنوان وظیفه",
        "تاریخ مشاهده",
        "صنف مشاهده شده",
        "مضمون",
        "مشاهده‌کننده",
        "دانش مضمونی",
        "پلان درسی",
        "مدیریت صنف",
        "ارزیابی",
        "آموزش‌های مسلکی",
        "ارتباط با اجتماع",
        "مجموع نمره",
        "نتیجه نهایی",
        "نکات قوت",
        "نکات قابل اصلاح",
        "ملاحظات",
    ]


def _teacher_observation_row(observation, employee, observer) -> list[object | None]:
    return [
        observation.id,
        employee.name,
        employee.father_name,
        employee.school_workplace,
        get_job_title_display_label(employee.job_title_code),
        observation.observation_date,
        observation.observed_class,
        observation.subject,
        _observer_name(observer),
        format_teacher_competency(observation.subject_knowledge_score),
        format_teacher_competency(observation.lesson_plan_score),
        format_teacher_competency(observation.classroom_management_score),
        format_teacher_competency(observation.assessment_score),
        format_teacher_competency(observation.professional_learning_score),
        format_teacher_competency(observation.community_engagement_score),
        observation.total_score,
        get_teacher_final_result_display_label(observation.final_result_code),
        observation.strengths,
        observation.improvements,
        observation.notes,
    ]


def _amir_observation_headers() -> list[str]:
    return [
        "شماره",
        "اسم کارمند",
        "ولد",
        "محل وظیفه / مکتب",
        "عنوان وظیفه",
        "تاریخ مشاهده",
        "صنف مشاهده شده",
        "مضمون",
        "مشاهده‌کننده",
        "مسوولیت پذیری",
        "رهبری مسلکی",
        "روابط با جامعه",
        "انکشاف مسلکی",
        "مجموع نمره",
        "نتیجه نهایی",
        "نکات قوت",
        "نکات قابل اصلاح",
        "ملاحظات",
    ]


def _amir_observation_row(observation, employee, observer) -> list[object | None]:
    return [
        observation.id,
        employee.name,
        employee.father_name,
        employee.school_workplace,
        get_job_title_display_label(employee.job_title_code),
        observation.observation_date,
        observation.observed_class,
        observation.subject,
        _observer_name(observer),
        format_amir_competency(observation.responsibility_score),
        format_amir_competency(observation.professional_leadership_score),
        format_amir_competency(observation.community_relations_score),
        format_amir_competency(observation.professional_development_score),
        observation.total_score,
        get_amir_final_result_display_label(observation.final_result_code),
        observation.strengths,
        observation.improvements,
        observation.notes,
    ]


def _observer_name(observer) -> str:
    return " ".join((observer.name, observer.surname)).strip()


def _employee_row(employee: EmployeeRead) -> list[object | None]:
    return [
        employee.id,
        employee.name,
        employee.father_name,
        employee.grandfather_name,
        employee.school_workplace,
        employee.city_district,
        employee.phone_number,
        employee.field_of_study,
        employee.education_level,
        employee.subjects_taught,
        get_job_title_display_label(employee.job_title_code),
        employee.teaching_experience,
        employee.grade_post,
        employee.step,
        employee.successful_evaluation,
        get_field_match_display_label(employee.field_match_code),
        "، ".join(department.display_name for department in employee.departments),
        employee.notes,
    ]


def _school_headers() -> list[str]:
    headers = [
        "شماره",
        "نام مکتب",
        "شماره تماس آمر مکتب",
        "نوع مکتب",
        "نوع جنسیت",
        "کد مکتب",
        "تشکیل مکتب",
        "تعداد معلمان ارشد",
        "تعداد معلمان ذکور",
        "تعداد معلمان اناث",
        "تعداد معلمان خدماتی وارده",
        "تعداد معلمان خدماتی صادره",
        "تعداد معلمان داوطلب",
        "تعداد صنوف فعال",
        "نیازهای مکتب",
        "تجهیزات مکتب",
    ]
    for grade_number in range(1, 13):
        display_grade_number = _to_persian_digits(grade_number)
        headers.append(f"صنف {display_grade_number}")
    return headers


def _school_row(school: SchoolRead) -> list[object | None]:
    statistics_by_grade = {statistic.grade_number: statistic for statistic in school.grade_statistics}
    row: list[object | None] = [
        school.id,
        school.school_name,
        school.school_head_phone,
        school.school_type_display_name,
        school.gender_type_display_name,
        school.school_code,
        school.school_formation,
        school.senior_teacher_count,
        school.male_teacher_count,
        school.female_teacher_count,
        school.incoming_service_teacher_count,
        school.outgoing_service_teacher_count,
        school.volunteer_teacher_count,
        school.active_class_section_count,
        school.school_needs,
        school.school_equipment,
    ]
    for grade_number in range(1, 13):
        statistic = statistics_by_grade.get(grade_number)
        if statistic is None:
            row.append(None)
        else:
            row.append(
                "\n".join(
                    [
                        f"داخله: {statistic.enrolled_count}",
                        f"حاضر: {statistic.present_count}",
                        f"ذکور: {statistic.male_count}",
                        f"اناث: {statistic.female_count}",
                    ]
                )
            )
    return row


def _to_persian_digits(value: int) -> str:
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))

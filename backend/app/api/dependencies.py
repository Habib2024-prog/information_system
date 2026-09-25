from app.repositories.employee_repository import EmployeeFilters
from app.repositories.school_repository import SchoolFilters
from app.repositories.scientific_member_repository import ScientificMemberFilters


def get_employee_filters(
    search: str | None = None,
    name: str | None = None,
    father_name: str | None = None,
    school_workplace: str | None = None,
    city_district: str | None = None,
    field_of_study: str | None = None,
    education_level: str | None = None,
    job_title_code: str | None = None,
    grade_post: int | None = None,
    step: int | None = None,
    successful_evaluation: str | None = None,
    field_match_code: str | None = None,
    department_id: int | None = None,
) -> EmployeeFilters:
    return EmployeeFilters(
        search=search,
        name=name,
        father_name=father_name,
        school_workplace=school_workplace,
        city_district=city_district,
        field_of_study=field_of_study,
        education_level=education_level,
        job_title_code=job_title_code,
        grade_post=grade_post,
        step=step,
        successful_evaluation=successful_evaluation,
        field_match_code=field_match_code,
        department_id=department_id,
    )


def get_school_filters(
    search: str | None = None,
    school_name: str | None = None,
    school_code: str | None = None,
    school_type_code: str | None = None,
    gender_type_code: str | None = None,
    school_formation: str | None = None,
) -> SchoolFilters:
    return SchoolFilters(
        search=search,
        school_name=school_name,
        school_code=school_code,
        school_type_code=school_type_code,
        gender_type_code=gender_type_code,
        school_formation=school_formation,
    )


def get_scientific_member_filters(
    search: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    father_name: str | None = None,
    phone_number: str | None = None,
    academic_rank: str | None = None,
    department_id: int | None = None,
) -> ScientificMemberFilters:
    return ScientificMemberFilters(
        search=search,
        name=name,
        surname=surname,
        father_name=father_name,
        phone_number=phone_number,
        academic_rank=academic_rank,
        department_id=department_id,
    )

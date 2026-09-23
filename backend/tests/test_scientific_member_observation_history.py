from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.employee_codes import AMIR_JOB_TITLE_CODE, TEACHER_JOB_TITLE_CODE
from app.models.department import Department
from app.models.scientific_member import ScientificMember
from app.services.department_service import DepartmentService


def _science_department_id(db_session: Session) -> int:
    DepartmentService().seed_predefined_departments(db_session)
    department = db_session.scalar(select(Department).where(Department.code == "science"))
    assert department is not None
    return department.id


def _create_member(client: TestClient, department_id: int, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "مریم",
        "surname": "صادقی",
        "father_name": "حکیم",
        "phone_number": "0790000000",
        "academic_rank": "پوهنمل",
        "department_id": department_id,
        "notes": "ملاحظات عضو علمی",
    }
    payload.update(overrides)
    response = client.post("/api/scientific-members", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_employee(client: TestClient, job_title_code: str, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "سمیرا",
        "father_name": "کریم",
        "grandfather_name": "رحیم",
        "school_workplace": "لیسه مرکزی",
        "city_district": "کابل",
        "phone_number": "0700000000",
        "field_of_study": "ریاضی",
        "education_level": "لیسانس",
        "subjects_taught": "ریاضی",
        "job_title_code": job_title_code,
        "teaching_experience": 5,
        "grade_post": 4,
        "step": 2,
        "successful_evaluation": "yes",
        "field_match_code": "in_field",
        "notes": "ملاحظات کارمند",
        "department_ids": [],
    }
    payload.update(overrides)
    response = client.post("/api/employees", json=payload)
    assert response.status_code == 201
    return response.json()


def _create_teacher_observation(
    client: TestClient,
    employee_id: int,
    observer_id: int,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "observer_scientific_member_id": observer_id,
        "observation_date": "2026-09-10",
        "observed_class": "صنف دهم",
        "subject": "ریاضی",
        "subject_knowledge_score": "1.00",
        "lesson_plan_score": "1.00",
        "classroom_management_score": "1.00",
        "assessment_score": "1.00",
        "professional_learning_score": "1.00",
        "community_engagement_score": "1.00",
        "strengths": "نکات قوت",
        "improvements": "نکات قابل اصلاح",
        "notes": "ملاحظات",
    }
    payload.update(overrides)
    response = client.post(
        f"/api/employees/{employee_id}/teacher-observations",
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def _create_amir_observation(
    client: TestClient,
    employee_id: int,
    observer_id: int,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "observer_scientific_member_id": observer_id,
        "observation_date": "2026-09-20",
        "observed_class": "صنف دهم",
        "subject": "رهبری",
        "responsibility_score": "1.00",
        "professional_leadership_score": "1.00",
        "community_relations_score": "1.00",
        "professional_development_score": "1.00",
        "strengths": "نکات قوت",
        "improvements": "نکات قابل اصلاح",
        "notes": "ملاحظات",
    }
    payload.update(overrides)
    response = client.post(
        f"/api/employees/{employee_id}/amir-observations",
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def _member_count(client: TestClient, member_id: int) -> int:
    response = client.get(f"/api/scientific-members/{member_id}")
    assert response.status_code == 200
    return response.json()["observation_count"]


def test_member_with_zero_observations_returns_zero_count(
    client: TestClient,
    db_session: Session,
) -> None:
    member = _create_member(client, _science_department_id(db_session))

    assert _member_count(client, member["id"]) == 0
    list_response = client.get("/api/scientific-members")
    assert list_response.json()["items"][0]["observation_count"] == 0


def test_teacher_and_amir_observations_are_summed_for_member(
    client: TestClient,
    db_session: Session,
) -> None:
    member = _create_member(client, _science_department_id(db_session))
    teacher = _create_employee(client, TEACHER_JOB_TITLE_CODE)
    amir = _create_employee(client, AMIR_JOB_TITLE_CODE)

    _create_teacher_observation(client, teacher["id"], member["id"])
    assert _member_count(client, member["id"]) == 1
    _create_amir_observation(client, amir["id"], member["id"])

    assert _member_count(client, member["id"]) == 2


def test_count_excludes_soft_deleted_observations_and_other_members(
    client: TestClient,
    db_session: Session,
) -> None:
    department_id = _science_department_id(db_session)
    member = _create_member(client, department_id)
    other_member = _create_member(client, department_id, name="فرید", surname="احمدی")
    teacher = _create_employee(client, TEACHER_JOB_TITLE_CODE)
    amir = _create_employee(client, AMIR_JOB_TITLE_CODE)
    teacher_observation = _create_teacher_observation(client, teacher["id"], member["id"])
    amir_observation = _create_amir_observation(client, amir["id"], member["id"])
    _create_teacher_observation(client, teacher["id"], other_member["id"], observation_date="2026-09-11")

    assert _member_count(client, member["id"]) == 2
    assert _member_count(client, other_member["id"]) == 1
    assert (
        client.delete(
            f"/api/employees/{teacher['id']}/teacher-observations/{teacher_observation['id']}"
        ).status_code
        == 204
    )
    assert (
        client.delete(
            f"/api/employees/{amir['id']}/amir-observations/{amir_observation['id']}"
        ).status_code
        == 204
    )

    assert _member_count(client, member["id"]) == 0
    assert _member_count(client, other_member["id"]) == 1


def test_combined_history_includes_both_types_and_employee_identity(
    client: TestClient,
    db_session: Session,
) -> None:
    member = _create_member(client, _science_department_id(db_session))
    teacher = _create_employee(client, TEACHER_JOB_TITLE_CODE, name="معلم", father_name="احمد")
    amir = _create_employee(client, AMIR_JOB_TITLE_CODE, name="آمر", father_name="ناصر")
    _create_teacher_observation(client, teacher["id"], member["id"])
    _create_amir_observation(client, amir["id"], member["id"])

    response = client.get(f"/api/scientific-members/{member['id']}/observations")

    assert response.status_code == 200
    items = response.json()["items"]
    assert {item["observation_type"] for item in items} == {"teacher", "amir_senior_teacher"}
    teacher_item = next(item for item in items if item["observation_type"] == "teacher")
    assert teacher_item["observed_employee_name"] == "معلم"
    assert teacher_item["observed_employee_father_name"] == "احمد"
    assert teacher_item["observed_employee_job_title_code"] == TEACHER_JOB_TITLE_CODE


def test_history_default_ordering_and_filters(client: TestClient, db_session: Session) -> None:
    member = _create_member(client, _science_department_id(db_session))
    teacher = _create_employee(client, TEACHER_JOB_TITLE_CODE)
    amir = _create_employee(client, AMIR_JOB_TITLE_CODE)
    teacher_observation = _create_teacher_observation(
        client,
        teacher["id"],
        member["id"],
        observation_date="2026-09-10",
    )
    amir_observation = _create_amir_observation(
        client,
        amir["id"],
        member["id"],
        observation_date="2026-09-20",
    )
    base_path = f"/api/scientific-members/{member['id']}/observations"

    default_response = client.get(base_path)
    type_response = client.get(base_path, params={"observation_type": "teacher"})
    date_response = client.get(
        base_path,
        params={"date_from": "2026-09-01", "date_to": "2026-09-15"},
    )
    employee_response = client.get(base_path, params={"employee_id": teacher["id"]})
    final_result_response = client.get(
        base_path,
        params={"final_result_code": "needs_improvement"},
    )

    assert default_response.json()["items"][0]["observation_id"] == amir_observation["id"]
    assert default_response.json()["items"][1]["observation_id"] == teacher_observation["id"]
    assert type_response.json()["items"][0]["observation_type"] == "teacher"
    assert date_response.json()["total"] == 1
    assert date_response.json()["items"][0]["observation_id"] == teacher_observation["id"]
    assert employee_response.json()["items"][0]["observed_employee_id"] == teacher["id"]
    assert final_result_response.json()["items"][0]["observation_id"] == teacher_observation["id"]


def test_history_pagination_and_soft_deleted_member_visibility(
    client: TestClient,
    db_session: Session,
) -> None:
    member = _create_member(client, _science_department_id(db_session))
    teacher = _create_employee(client, TEACHER_JOB_TITLE_CODE)
    _create_teacher_observation(client, teacher["id"], member["id"], observation_date="2026-09-10")
    _create_teacher_observation(client, teacher["id"], member["id"], observation_date="2026-09-11")
    base_path = f"/api/scientific-members/{member['id']}/observations"

    first_page = client.get(base_path, params={"page": 1, "page_size": 1})
    second_page = client.get(base_path, params={"page": 2, "page_size": 1})

    assert first_page.json()["total"] == 2
    assert first_page.json()["items"][0]["observation_id"] != second_page.json()["items"][0]["observation_id"]

    assert client.delete(f"/api/scientific-members/{member['id']}").status_code == 204
    assert client.get("/api/scientific-members").json()["items"] == []
    assert client.get(base_path).status_code == 404


def test_scientific_members_table_has_no_observation_count_column() -> None:
    assert "observation_count" not in ScientificMember.__table__.columns.keys()

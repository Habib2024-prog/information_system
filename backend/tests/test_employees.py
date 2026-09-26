from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.department_labels import DEPARTMENT_DISPLAY_LABELS
from app.common.employee_codes import TEACHER_JOB_TITLE_CODE
from app.models.department import Department
from app.models.employee_department import EmployeeDepartment
from app.models.amir_observation import AmirObservation
from app.models.teacher_observation import TeacherObservation
from app.services.department_service import DepartmentService


def employee_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Ahmad",
        "father_name": "Karim",
        "grandfather_name": "Rahim",
        "school_workplace": "Central School",
        "city_district": "Kabul",
        "phone_number": "0700000000",
        "field_of_study": "Mathematics",
        "education_level": "Bachelor",
        "subjects_taught": "Mathematics and Physics",
        "job_title_code": TEACHER_JOB_TITLE_CODE,
        "teaching_experience": 5,
        "grade_post": 4,
        "step": 2,
        "successful_evaluation": "yes",
        "field_match_code": "in_field",
        "notes": "Employee note",
        "department_ids": [],
    }
    payload.update(overrides)
    return payload


def seed_education_department(db_session: Session) -> Department:
    DepartmentService().seed_predefined_departments(db_session)
    department = db_session.scalar(select(Department).where(Department.code == "education_training"))
    assert department is not None
    return department


def create_additional_department(db_session: Session, monkeypatch) -> Department:
    code = "test_additional_department"
    monkeypatch.setitem(DEPARTMENT_DISPLAY_LABELS, code, "دیپارتمنت آزمایشی")
    department = Department(code=code)
    db_session.add(department)
    db_session.commit()
    return department


def test_create_teacher_with_multiple_departments(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    education_department = seed_education_department(db_session)
    additional_department = create_additional_department(db_session, monkeypatch)

    response = client.post(
        "/api/employees",
        json=employee_payload(department_ids=[education_department.id, additional_department.id]),
    )

    assert response.status_code == 201
    assert {department["id"] for department in response.json()["departments"]} == {
        education_department.id,
        additional_department.id,
    }


def test_create_non_teacher_adds_education_department_automatically(
    client: TestClient,
    db_session: Session,
) -> None:
    education_department = seed_education_department(db_session)

    response = client.post(
        "/api/employees",
        json=employee_payload(job_title_code="non_teacher_for_test"),
    )

    assert response.status_code == 201
    assert [department["id"] for department in response.json()["departments"]] == [
        education_department.id
    ]


def test_non_teacher_can_have_education_and_additional_departments(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    education_department = seed_education_department(db_session)
    additional_department = create_additional_department(db_session, monkeypatch)

    response = client.post(
        "/api/employees",
        json=employee_payload(
            job_title_code="non_teacher_for_test",
            department_ids=[additional_department.id],
        ),
    )

    assert response.status_code == 201
    assert {department["id"] for department in response.json()["departments"]} == {
        education_department.id,
        additional_department.id,
    }


def test_update_non_teacher_preserves_education_department(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    education_department = seed_education_department(db_session)
    additional_department = create_additional_department(db_session, monkeypatch)
    create_response = client.post(
        "/api/employees",
        json=employee_payload(job_title_code="non_teacher_for_test"),
    )
    employee_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/employees/{employee_id}",
        json=employee_payload(
            job_title_code="non_teacher_for_test",
            department_ids=[additional_department.id],
        ),
    )

    assert update_response.status_code == 200
    assert {department["id"] for department in update_response.json()["departments"]} == {
        education_department.id,
        additional_department.id,
    }


def test_teacher_does_not_receive_education_department_automatically(
    client: TestClient,
    db_session: Session,
) -> None:
    seed_education_department(db_session)

    response = client.post("/api/employees", json=employee_payload())

    assert response.status_code == 201
    assert response.json()["departments"] == []


def test_invalid_department_id_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/employees",
        json=employee_payload(department_ids=[999999]),
    )

    assert response.status_code == 422


def test_duplicate_department_ids_do_not_create_duplicate_assignments(
    client: TestClient,
    db_session: Session,
) -> None:
    education_department = seed_education_department(db_session)

    response = client.post(
        "/api/employees",
        json=employee_payload(department_ids=[education_department.id, education_department.id]),
    )

    assert response.status_code == 201
    employee_id = response.json()["id"]
    assignment_count = db_session.scalar(
        select(func.count())
        .select_from(EmployeeDepartment)
        .where(
            EmployeeDepartment.employee_id == employee_id,
            EmployeeDepartment.deleted_at.is_(None),
        )
    )
    assert assignment_count == 1


def test_soft_deleted_employee_is_excluded_from_normal_listing(client: TestClient) -> None:
    create_response = client.post("/api/employees", json=employee_payload())
    employee_id = create_response.json()["id"]

    delete_response = client.delete(f"/api/employees/{employee_id}")
    list_response = client.get("/api/employees")

    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 0
    assert list_response.json()["items"] == []


def test_department_filter_returns_complete_employee_details(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    additional_department = create_additional_department(db_session, monkeypatch)
    client.post(
        "/api/employees",
        json=employee_payload(department_ids=[additional_department.id]),
    )

    response = client.get(f"/api/employees?department_id={additional_department.id}")

    assert response.status_code == 200
    employee = response.json()["items"][0]
    assert employee["grandfather_name"] == "Rahim"
    assert employee["subjects_taught"] == "Mathematics and Physics"
    assert employee["phone_number"] == "0700000000"
    assert employee["departments"][0]["id"] == additional_department.id


def test_combined_filters_use_and_logic(client: TestClient) -> None:
    client.post(
        "/api/employees",
        json=employee_payload(name="Ali", city_district="Kabul"),
    )
    client.post(
        "/api/employees",
        json=employee_payload(name="Ali", city_district="Herat"),
    )

    response = client.get("/api/employees?name=Ali&city_district=Kabul")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["city_district"] == "Kabul"


def test_employee_observation_count_sums_active_observations(
    client: TestClient,
    db_session: Session,
) -> None:
    employee_id = client.post("/api/employees", json=employee_payload()).json()["id"]
    teacher_observation = TeacherObservation(
        employee_id=employee_id,
        observer_scientific_member_id=1,
        observation_date=date(2026, 9, 1),
        observed_class="صنف دهم",
        subject="ریاضی",
        subject_knowledge_score=Decimal("2.00"),
        lesson_plan_score=Decimal("2.00"),
        classroom_management_score=Decimal("2.00"),
        assessment_score=Decimal("2.00"),
        professional_learning_score=Decimal("2.00"),
        community_engagement_score=Decimal("2.00"),
        total_score=Decimal("12.00"),
    )
    amir_observation = AmirObservation(
        employee_id=employee_id,
        observer_scientific_member_id=1,
        observation_date=date(2026, 9, 2),
        observed_class="صنف دهم",
        subject="ریاضی",
        responsibility_score=Decimal("2.00"),
        professional_leadership_score=Decimal("2.00"),
        community_relations_score=Decimal("2.00"),
        professional_development_score=Decimal("2.00"),
        total_score=Decimal("8.00"),
    )
    deleted_teacher_observation = TeacherObservation(
        employee_id=employee_id,
        observer_scientific_member_id=1,
        observation_date=date(2026, 9, 3),
        observed_class="صنف دهم",
        subject="ریاضی",
        subject_knowledge_score=Decimal("2.00"),
        lesson_plan_score=Decimal("2.00"),
        classroom_management_score=Decimal("2.00"),
        assessment_score=Decimal("2.00"),
        professional_learning_score=Decimal("2.00"),
        community_engagement_score=Decimal("2.00"),
        total_score=Decimal("12.00"),
        deleted_at=datetime.now(timezone.utc),
    )
    db_session.add_all([teacher_observation, amir_observation, deleted_teacher_observation])
    db_session.commit()

    list_response = client.get("/api/employees")
    detail_response = client.get(f"/api/employees/{employee_id}")

    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["observation_count"] == 2
    assert detail_response.status_code == 200
    assert detail_response.json()["observation_count"] == 2

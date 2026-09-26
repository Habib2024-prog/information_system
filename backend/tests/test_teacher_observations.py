from datetime import date, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.employee_codes import TEACHER_JOB_TITLE_CODE
from app.models.department import Department
from app.services.department_service import DepartmentService


def _employee_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "سمیرا",
        "father_name": "حکیم",
        "grandfather_name": "کریم",
        "school_workplace": "لیسه مرکزی",
        "city_district": "کابل",
        "phone_number": "0700000000",
        "field_of_study": "ریاضی",
        "education_level": "لیسانس",
        "subjects_taught": "ریاضی",
        "job_title_code": TEACHER_JOB_TITLE_CODE,
        "teaching_experience": 5,
        "grade_post": 4,
        "step": 2,
        "successful_evaluation": "yes",
        "field_match_code": "in_field",
        "notes": "ملاحظات کارمند",
        "department_ids": [],
    }
    payload.update(overrides)
    return payload


def _create_employee(client: TestClient, **overrides: object) -> dict[str, object]:
    response = client.post("/api/employees", json=_employee_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def _science_department_id(db_session: Session) -> int:
    DepartmentService().seed_predefined_departments(db_session)
    department = db_session.scalar(select(Department).where(Department.code == "science"))
    assert department is not None
    return department.id


def _create_observer(
    client: TestClient,
    department_id: int,
    **overrides: object,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "مریم",
        "surname": "صادقی",
        "father_name": "ناصر",
        "phone_number": "0790000000",
        "academic_rank": "پوهنمل",
        "department_id": department_id,
        "notes": "ملاحظات عضو علمی",
    }
    payload.update(overrides)
    response = client.post("/api/scientific-members", json=payload)
    assert response.status_code == 201
    return response.json()


def _observation_payload(observer_id: int, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "observer_scientific_member_id": observer_id,
        "observation_date": "2026-09-20",
        "observed_class": "صنف دهم",
        "subject": "ریاضی",
        "subject_knowledge_score": "1.00",
        "lesson_plan_score": "1.00",
        "classroom_management_score": "1.00",
        "assessment_score": "1.00",
        "professional_learning_score": "1.00",
        "community_engagement_score": "1.00",
        "strengths": "نکات قوت تفصیلی",
        "improvements": "نکات قابل اصلاح تفصیلی",
        "notes": "ملاحظات تفصیلی",
    }
    payload.update(overrides)
    return payload


def _create_observation(
    client: TestClient,
    employee_id: int,
    observer_id: int,
    **overrides: object,
) -> dict[str, object]:
    response = client.post(
        f"/api/employees/{employee_id}/teacher-observations",
        json=_observation_payload(observer_id, **overrides),
    )
    assert response.status_code == 201
    return response.json()


def _teacher_and_observer(client: TestClient, db_session: Session) -> tuple[dict[str, object], dict[str, object]]:
    employee = _create_employee(client)
    observer = _create_observer(client, _science_department_id(db_session))
    return employee, observer


def test_create_observation_for_valid_teacher(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"]),
    )

    assert response.status_code == 201
    assert response.json()["employee_id"] == employee["id"]
    assert response.json()["observer"]["id"] == observer["id"]


def test_teacher_can_have_multiple_observations_without_uniqueness_conflict(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    first = _create_observation(client, employee["id"], observer["id"])
    second = _create_observation(
        client,
        employee["id"],
        observer["id"],
        observation_date="2026-09-21",
    )
    response = client.get(f"/api/employees/{employee['id']}/teacher-observations")

    assert first["id"] != second["id"]
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_rejects_observation_for_non_teacher(client: TestClient, db_session: Session) -> None:
    _science_department_id(db_session)
    employee = _create_employee(client, job_title_code="manager")
    observer = _create_observer(client, _science_department_id(db_session))

    response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"]),
    )

    assert response.status_code == 422


def test_rejects_invalid_or_soft_deleted_employee(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    invalid_response = client.post(
        f"/api/employees/{int(employee['id']) + 100000}/teacher-observations",
        json=_observation_payload(observer["id"]),
    )
    assert invalid_response.status_code == 404

    assert client.delete(f"/api/employees/{employee['id']}").status_code == 204
    deleted_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"]),
    )
    assert deleted_response.status_code == 404


def test_rejects_invalid_or_soft_deleted_observer(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    invalid_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(int(observer["id"]) + 100000),
    )
    assert invalid_response.status_code == 422

    assert client.delete(f"/api/scientific-members/{observer['id']}").status_code == 204
    deleted_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"]),
    )
    assert deleted_response.status_code == 422


def test_rejects_scores_outside_allowed_range(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    below_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"], subject_knowledge_score="-0.01"),
    )
    above_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"], subject_knowledge_score="3.01"),
    )

    assert below_response.status_code == 422
    assert above_response.status_code == 422


def test_teacher_observation_validates_dates_and_score_precision(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    endpoint = f"/api/employees/{employee['id']}/teacher-observations"

    for index, score in enumerate(("0", "3", "2", "2.1", "2.10", "0.28", "2.25")):
        response = client.post(
            endpoint,
            json=_observation_payload(
                observer["id"],
                observation_date=(date.today() - timedelta(days=index)).isoformat(),
                subject_knowledge_score=score,
            ),
        )
        assert response.status_code == 201

    future_response = client.post(
        endpoint,
        json=_observation_payload(observer["id"], observation_date=(date.today() + timedelta(days=1)).isoformat()),
    )
    precision_response = client.post(
        endpoint,
        json=_observation_payload(observer["id"], subject_knowledge_score="2.123"),
    )
    negative_response = client.post(
        endpoint,
        json=_observation_payload(observer["id"], subject_knowledge_score="-0.1"),
    )
    above_response = client.post(
        endpoint,
        json=_observation_payload(observer["id"], subject_knowledge_score="3.01"),
    )

    assert future_response.status_code == 422
    assert precision_response.status_code == 422
    assert negative_response.status_code == 422
    assert above_response.status_code == 422


def test_calculates_total_score_and_defined_final_result(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    observation = _create_observation(
        client,
        employee["id"],
        observer["id"],
        subject_knowledge_score="3.00",
        lesson_plan_score="3.00",
        classroom_management_score="3.00",
        assessment_score="3.00",
        professional_learning_score="3.00",
        community_engagement_score="3.00",
    )

    assert Decimal(observation["total_score"]) == Decimal("18")
    assert observation["final_result_code"] == "mastery"


def test_client_cannot_submit_server_controlled_result_fields(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)

    total_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"], total_score="999.00"),
    )
    final_result_response = client.post(
        f"/api/employees/{employee['id']}/teacher-observations",
        json=_observation_payload(observer["id"], final_result_code="mastery"),
    )

    assert total_response.status_code == 422
    assert final_result_response.status_code == 422


def test_decimal_total_in_approved_teacher_range_gets_final_result(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    observation = _create_observation(
        client,
        employee["id"],
        observer["id"],
        subject_knowledge_score="3.00",
        lesson_plan_score="3.00",
        classroom_management_score="3.00",
        assessment_score="1.00",
        professional_learning_score="0.50",
        community_engagement_score="0.00",
    )

    assert Decimal(observation["total_score"]) == Decimal("10.50")
    assert observation["final_result_code"] == "needs_improvement"


def test_update_recalculates_total_score(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    observation = _create_observation(client, employee["id"], observer["id"])

    response = client.put(
        f"/api/employees/{employee['id']}/teacher-observations/{observation['id']}",
        json=_observation_payload(
            observer["id"],
            subject_knowledge_score="2.00",
            lesson_plan_score="2.00",
            classroom_management_score="2.00",
            assessment_score="2.00",
            professional_learning_score="2.00",
            community_engagement_score="2.00",
        ),
    )

    assert response.status_code == 200
    assert Decimal(response.json()["total_score"]) == Decimal("12")
    assert response.json()["final_result_code"] == "has_capability"


def test_soft_deleted_observation_is_excluded_from_list(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    observation = _create_observation(client, employee["id"], observer["id"])

    assert (
        client.delete(
            f"/api/employees/{employee['id']}/teacher-observations/{observation['id']}"
        ).status_code
        == 204
    )
    response = client.get(f"/api/employees/{employee['id']}/teacher-observations")

    assert response.status_code == 200
    assert response.json()["items"] == []


def test_observer_and_date_range_filters_work(client: TestClient, db_session: Session) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    second_observer = _create_observer(
        client,
        _science_department_id(db_session),
        name="فرهاد",
        surname="احمدی",
    )
    first = _create_observation(
        client,
        employee["id"],
        observer["id"],
        observation_date="2026-09-10",
    )
    _create_observation(
        client,
        employee["id"],
        second_observer["id"],
        observation_date="2026-09-20",
    )

    observer_response = client.get(
        f"/api/employees/{employee['id']}/teacher-observations",
        params={"observer_scientific_member_id": observer["id"]},
    )
    date_response = client.get(
        f"/api/employees/{employee['id']}/teacher-observations",
        params={"observation_date_from": "2026-09-01", "observation_date_to": "2026-09-15"},
    )

    assert observer_response.json()["total"] == 1
    assert observer_response.json()["items"][0]["id"] == first["id"]
    assert date_response.json()["total"] == 1
    assert date_response.json()["items"][0]["id"] == first["id"]


def test_detail_response_contains_all_observation_fields(
    client: TestClient,
    db_session: Session,
) -> None:
    employee, observer = _teacher_and_observer(client, db_session)
    observation = _create_observation(client, employee["id"], observer["id"])

    response = client.get(
        f"/api/employees/{employee['id']}/teacher-observations/{observation['id']}"
    )

    assert response.status_code == 200
    body = response.json()
    assert {
        "id",
        "employee_id",
        "observer_scientific_member_id",
        "observation_date",
        "observed_class",
        "subject",
        "subject_knowledge_score",
        "lesson_plan_score",
        "classroom_management_score",
        "assessment_score",
        "professional_learning_score",
        "community_engagement_score",
        "total_score",
        "final_result_code",
        "strengths",
        "improvements",
        "notes",
        "observer",
        "created_at",
        "updated_at",
    }.issubset(body)
    assert body["observer"]["name"] == "مریم"

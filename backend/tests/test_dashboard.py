from datetime import date, datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import require_secret_key
from app.models.amir_observation import AmirObservation
from app.models.audit_log import AuditLog
from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment
from app.models.school import School
from app.models.scientific_member import ScientificMember
from app.models.teacher_observation import TeacherObservation
from app.models.user import User
from app.services.dashboard_service import DashboardService
from tests.test_amir_observations import _observation_payload as amir_payload
from tests.test_employees import employee_payload
from tests.test_schools import _school_payload
from tests.test_teacher_observations import _observation_payload as teacher_payload


@pytest.fixture
def dashboard_records(db_session: Session) -> dict:
    deleted_at = datetime.now(timezone.utc)
    departments = [Department(code="science"), Department(code="mathematics")]
    db_session.add_all(departments)
    employees = []
    for title in ("teacher", "amir", "senior_teacher"):
        values = employee_payload(job_title_code=title)
        values.pop("department_ids")
        employees.append(Employee(**values))
    db_session.add_all(employees)
    db_session.flush()
    db_session.add_all([
        EmployeeDepartment(employee_id=employees[0].id, department_id=department.id)
        for department in departments
    ])
    members = [ScientificMember(
        name="مریم", surname="صادقی", father_name="حکیم", phone_number="0790000000",
        academic_rank="عضو علمی", department_id=departments[0].id,
        deleted_at=deleted_at if is_deleted else None,
    ) for is_deleted in (False, True)]
    db_session.add_all(members)
    for is_deleted in (False, True):
        values = _school_payload(school_code="DELETED" if is_deleted else "ACTIVE")
        values.pop("grade_statistics")
        db_session.add(School(**values, deleted_at=deleted_at if is_deleted else None))
    db_session.flush()
    teachers = []
    for code, score, total, is_deleted in (
        ("needs_improvement", "1.00", "6.00", False),
        ("has_capability", "2.00", "12.00", False),
        (None, "0.10", "0.60", False),
        ("mastery", "3.00", "18.00", True),
    ):
        values = teacher_payload(members[0].id)
        for name in values:
            if name.endswith("_score"):
                values[name] = score
        # Pydantic converts the payload date before real service/model insertion.
        values["observation_date"] = date.fromisoformat(values["observation_date"])
        teachers.append(TeacherObservation(
            **values, employee_id=employees[0].id, total_score=total,
            final_result_code=code, deleted_at=deleted_at if is_deleted else None,
        ))
    amirs = []
    for employee, code, score, total, is_deleted in (
        (employees[1], "basic_capability", "1.00", "4.00", False),
        (employees[2], "mastery", "3.00", "12.00", False),
        (employees[1], "applied_capability", "2.00", "8.00", True),
    ):
        values = amir_payload(members[0].id)
        for name in values:
            if name.endswith("_score"):
                values[name] = score
        values["observation_date"] = date.fromisoformat(values["observation_date"])
        amirs.append(AmirObservation(
            **values, employee_id=employee.id, total_score=total,
            final_result_code=code, deleted_at=deleted_at if is_deleted else None,
        ))
    db_session.add_all([*teachers, *amirs])
    db_session.commit()
    return {"employees": employees, "members": members, "teachers": teachers, "amirs": amirs}


def test_empty_dashboard_returns_real_zero_counts(client: TestClient) -> None:
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "totals": {"employees": 0, "scientific_members": 0, "schools": 0, "observations": 0},
        "observation_overview": [
            {"observation_type": "teacher", "total": 0, "results": []},
            {"observation_type": "amir_senior_teacher", "total": 0, "results": []},
        ],
    }


def test_summary_counts_all_active_observation_types_without_duplicate_employees(
    client: TestClient, dashboard_records: dict,
) -> None:
    data = client.get("/api/dashboard/summary").json()
    assert data["totals"] == {"employees": 3, "scientific_members": 1, "schools": 1, "observations": 5}
    assert [item["total"] for item in data["observation_overview"]] == [3, 2]
    results = {item["observation_type"]: {
        row["final_result_code"]: row["count"] for row in item["results"]
    } for item in data["observation_overview"]}
    assert results == {
        "teacher": {None: 1, "needs_improvement": 1, "has_capability": 1},
        "amir_senior_teacher": {"basic_capability": 1, "mastery": 1},
    }


def test_dashboard_refreshes_counts_after_deletion_and_preserves_active_history(
    client: TestClient, db_session: Session, dashboard_records: dict,
) -> None:
    dashboard_records["employees"][0].deleted_at = datetime.now(timezone.utc)
    dashboard_records["members"][0].deleted_at = datetime.now(timezone.utc)
    dashboard_records["teachers"][0].deleted_at = datetime.now(timezone.utc)
    db_session.commit()
    totals = client.get("/api/dashboard/summary").json()["totals"]
    assert totals == {"employees": 2, "scientific_members": 0, "schools": 1, "observations": 4}


def test_dashboard_uses_bounded_aggregate_queries(db_session: Session, dashboard_records: dict) -> None:
    statements = []

    def collect(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    engine = db_session.get_bind()
    event.listen(engine, "before_cursor_execute", collect)
    try:
        summary = DashboardService().get_summary(db_session)
    finally:
        event.remove(engine, "before_cursor_execute", collect)
    assert summary.totals.observations == 5
    assert len(statements) == 2
    assert all("count(" in statement.lower() for statement in statements)
    assert "UNION ALL" in statements[1]
    assert "notes" not in " ".join(statements)


def test_dashboard_count_is_not_limited_to_a_list_page(db_session: Session, client: TestClient) -> None:
    values = employee_payload()
    values.pop("department_ids")
    db_session.add_all([Employee(**values) for _ in range(105)])
    db_session.commit()
    assert client.get("/api/dashboard/summary").json()["totals"]["employees"] == 105


def test_dashboard_requires_authentication(anonymous_client: TestClient) -> None:
    assert anonymous_client.get("/api/dashboard/summary").status_code == 401


@pytest.mark.parametrize("token_type", ["invalid", "expired"])
def test_dashboard_rejects_invalid_or_expired_sessions(
    anonymous_client: TestClient, authenticated_user: User, token_type: str,
) -> None:
    token = "invalid-token"
    if token_type == "expired":
        past = datetime.now(timezone.utc) - timedelta(hours=2)
        token = jwt.encode(
            {"sub": str(authenticated_user.id), "iat": past, "exp": past + timedelta(minutes=1)},
            require_secret_key(), algorithm=settings.jwt_algorithm,
        )
    response = anonymous_client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_recent_dashboard_activity_reuses_admin_audit_list_newest_first(
    db_session: Session, client: TestClient, authenticated_user: User,
) -> None:
    assert client.get("/api/audit-logs?page=1&page_size=5&sort_by=created_at&sort_order=desc").status_code == 403
    authenticated_user.role_code = "admin"
    db_session.commit()
    created_at = datetime.now(timezone.utc)
    logs = [AuditLog(
        user_id=authenticated_user.id, action="CREATE", entity_type="employee",
        entity_id=None, description=f"فعالیت {index}", created_at=created_at,
    ) for index in range(7)]
    db_session.add_all(logs)
    db_session.commit()
    response = client.get("/api/audit-logs?page=1&page_size=5&sort_by=created_at&sort_order=desc")
    assert response.status_code == 200
    assert response.json()["total"] == 7
    assert [row["id"] for row in response.json()["items"]] == [log.id for log in reversed(logs)][0:5]


def test_admin_with_no_activities_gets_an_empty_activity_list(
    client: TestClient, authenticated_user: User, db_session: Session,
) -> None:
    authenticated_user.role_code = "admin"
    db_session.commit()
    assert client.get("/api/audit-logs?page=1&page_size=5").json()["items"] == []

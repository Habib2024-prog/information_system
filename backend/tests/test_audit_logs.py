import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateTable

from app.common.audit_codes import AuditAction, AuditEntity
from app.core.security import create_access_token
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.models.school import School
from app.models.user import User
from app.services.audit_service import AUDIT_CONTEXT_KEY, AuditContext, audit_service, sanitize_audit_data
from app.services.department_service import DepartmentService
from app.services.excel_export_service import ExcelExportService
from tests.test_employees import employee_payload
from tests.test_schools import _school_payload, _grade, _section
from tests.test_teacher_observations import _create_observer, _science_department_id, _observation_payload
from tests.test_amir_observations import _observation_payload as amir_payload


@pytest.fixture
def audit_admin(db_session: Session, test_password_hash: str) -> User:
    user = User(username="audit-admin", full_name="مدیر آزمایشی", role_code="admin",
                password_hash=test_password_hash, is_active=True)
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def admin_headers(audit_admin: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(audit_admin.id)}"}


def logs(db: Session, entity: str, action: str | None = None) -> list[AuditLog]:
    statement = select(AuditLog).where(AuditLog.entity_type == entity)
    if action:
        statement = statement.where(AuditLog.action == action)
    return list(db.scalars(statement.order_by(AuditLog.id)))


def create_employee(client: TestClient, **values) -> dict:
    response = client.post("/api/employees", json=employee_payload(**values))
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize("path", [
    "/api/employees", "/api/departments", "/api/scientific-members", "/api/schools",
    "/api/teacher-observations", "/api/amir-observations", "/api/employees/export",
    "/api/departments/1/employees/export", "/api/scientific-members/export",
    "/api/scientific-members/1/observations", "/api/scientific-members/1/observations/export",
    "/api/teacher-observations/export", "/api/amir-observations/export", "/api/schools/export",
    "/api/employees/1/teacher-observations", "/api/employees/1/amir-observations",
    "/api/schools/1/grade-statistics", "/api/users", "/api/audit-logs",
])
def test_all_application_lists_and_exports_require_authentication(anonymous_client: TestClient, path: str) -> None:
    response = anonymous_client.get(path)
    assert response.status_code == 401


@pytest.mark.parametrize("method,path", [
    ("POST", "/api/employees"), ("PUT", "/api/employees/1"), ("DELETE", "/api/employees/1"),
    ("POST", "/api/departments"), ("PUT", "/api/departments/1"),
    ("POST", "/api/scientific-members"), ("PUT", "/api/scientific-members/1"), ("DELETE", "/api/scientific-members/1"),
    ("POST", "/api/schools"), ("PUT", "/api/schools/1"), ("DELETE", "/api/schools/1"),
    ("POST", "/api/employees/1/teacher-observations"), ("PUT", "/api/employees/1/teacher-observations/1"),
    ("DELETE", "/api/employees/1/teacher-observations/1"),
    ("POST", "/api/employees/1/amir-observations"), ("PUT", "/api/employees/1/amir-observations/1"),
    ("DELETE", "/api/employees/1/amir-observations/1"),
])
def test_business_write_routes_require_authentication(anonymous_client: TestClient, method: str, path: str) -> None:
    assert anonymous_client.request(method, path, json={}).status_code == 401


def test_login_and_health_remain_public(anonymous_client: TestClient, audit_admin: User, db_session: Session) -> None:
    assert anonymous_client.get("/health").status_code == 200
    result = anonymous_client.post("/api/auth/login", json={"username": audit_admin.username, "password": "test-password"})
    assert result.status_code == 200
    entries = logs(db_session, "user", "LOGIN")
    assert len(entries) == 1
    assert entries[0].user_id == entries[0].entity_id == audit_admin.id
    assert entries[0].ip_address == "testclient"
    assert entries[0].before_data is None
    assert entries[0].after_data is None
    assert "test-password" not in json.dumps(entries[0].event_metadata)
    assert anonymous_client.post("/api/auth/login", json={"username": audit_admin.username, "password": "wrong-password"}).status_code == 401
    assert len(logs(db_session, "user", "LOGIN")) == 1


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_api_documentation_requires_authentication(anonymous_client: TestClient, path: str, authenticated_user: User) -> None:
    assert anonymous_client.get(path).status_code == 401
    headers = {"Authorization": f"Bearer {create_access_token(authenticated_user.id)}"}
    assert anonymous_client.get(path, headers=headers).status_code == 200


def test_normal_user_can_use_modules_but_not_admin_endpoints(client: TestClient) -> None:
    assert client.get("/api/employees").status_code == 200
    assert client.get("/api/users").status_code == 403
    assert client.get("/api/audit-logs").status_code == 403
    assert client.get("/api/audit-logs/1").status_code == 403


def test_employee_create_update_delete_snapshots_and_actor(client: TestClient, db_session: Session,
                                                          authenticated_user: User, admin_headers: dict) -> None:
    employee = create_employee(client)
    assert client.put(f"/api/employees/{employee['id']}", json=employee_payload(name="نام جدید")).status_code == 200
    assert client.delete(f"/api/employees/{employee['id']}").status_code == 204
    entries = logs(db_session, "employee")
    assert [entry.action for entry in entries] == ["CREATE", "UPDATE", "DELETE"]
    assert all(entry.user_id == authenticated_user.id for entry in entries)
    assert entries[0].before_data is None
    assert entries[0].after_data["name"] == "Ahmad"
    assert entries[1].before_data["name"] == "Ahmad"
    assert entries[1].after_data["name"] == "نام جدید"
    assert entries[2].before_data["deleted_at"] is None
    assert entries[2].after_data["deleted_at"] is not None
    response = client.get(f"/api/audit-logs/{entries[1].id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["user"]["id"] == authenticated_user.id
    assert response.json()["before_data"]["name"] == "Ahmad"
    assert client.get("/api/audit-logs/999999", headers=admin_headers).status_code == 404


def test_employee_department_assignment_changes_are_in_snapshot(client: TestClient, db_session: Session) -> None:
    department_id = _science_department_id(db_session)
    employee = create_employee(client)
    assert client.put(f"/api/employees/{employee['id']}", json=employee_payload(department_ids=[department_id])).status_code == 200
    entry = logs(db_session, "employee", "UPDATE")[0]
    assert entry.before_data["department_ids"] == []
    assert entry.after_data["department_ids"] == [department_id]


def test_scientific_member_crud_audited(client: TestClient, db_session: Session) -> None:
    member = _create_observer(client, _science_department_id(db_session))
    payload = {key: member[key] for key in ("name", "surname", "father_name", "phone_number", "academic_rank", "notes")}
    payload.update(department_id=member["department"]["id"], academic_rank="هر رتبه علمی")
    assert client.put(f"/api/scientific-members/{member['id']}", json=payload).status_code == 200
    assert client.delete(f"/api/scientific-members/{member['id']}").status_code == 204
    entries = logs(db_session, "scientific_member")
    assert [entry.action for entry in entries] == ["CREATE", "UPDATE", "DELETE"]
    assert entries[1].before_data["academic_rank"] == "پوهنمل"
    assert entries[1].after_data["academic_rank"] == "هر رتبه علمی"


@pytest.mark.parametrize("observation_type,job", [("teacher", "teacher"), ("amir", "amir"), ("amir", "senior_teacher")])
def test_all_observation_actions_audited(client: TestClient, db_session: Session, observation_type: str, job: str) -> None:
    DepartmentService().seed_predefined_departments(db_session)
    employee = create_employee(client, job_title_code=job)
    observer = _create_observer(client, _science_department_id(db_session))
    payload = (_observation_payload if observation_type == "teacher" else amir_payload)(
        observer["id"], observation_date=date.today().isoformat(),
    )
    path = f"/api/employees/{employee['id']}/{observation_type}-observations"
    response = client.post(path, json=payload)
    assert response.status_code == 201
    record_id = response.json()["id"]
    payload["subject"] = "مضمون جدید"
    assert client.put(f"{path}/{record_id}", json=payload).status_code == 200
    assert client.delete(f"{path}/{record_id}").status_code == 204
    entries = logs(db_session, f"{observation_type}_observation")
    assert [entry.action for entry in entries] == ["CREATE_OBSERVATION", "UPDATE_OBSERVATION", "DELETE_OBSERVATION"]
    assert all(entry.entity_id == record_id for entry in entries)
    assert entries[1].before_data["subject"] != "مضمون جدید"
    assert entries[1].after_data["subject"] == "مضمون جدید"
    assert entries[0].after_data["employee_id"] == employee["id"]
    assert "total_score" in entries[0].after_data


def test_school_and_section_actions_are_atomic_and_audited(client: TestClient, db_session: Session) -> None:
    response = client.post("/api/schools", json=_school_payload(grade_statistics=[_grade(1, _section("الف"), _section("ب"))]))
    assert response.status_code == 201
    school = response.json()
    first = school["grade_statistics"][0]["sections"][0]
    second = school["grade_statistics"][0]["sections"][1]
    updated_section = _section("الف", id=first["id"], enrolled_count=32)
    response = client.put(f"/api/schools/{school['id']}", json=_school_payload(
        school_name="مکتب جدید", grade_statistics=[_grade(1, updated_section, _section("ج"))],
    ))
    assert response.status_code == 200
    assert client.delete(f"/api/schools/{school['id']}").status_code == 204
    assert [entry.action for entry in logs(db_session, "school")] == ["CREATE", "UPDATE", "DELETE"]
    section_entries = logs(db_session, "school_grade_section")
    assert len([entry for entry in section_entries if entry.action == "CREATE"]) == 3
    changed = next(entry for entry in section_entries if entry.action == "UPDATE")
    assert changed.before_data["enrolled_count"] == 30
    assert changed.after_data["enrolled_count"] == 32
    removed = next(entry for entry in section_entries if entry.action == "DELETE")
    assert removed.entity_id == second["id"]
    assert removed.before_data["section_name"] == "ب"
    assert removed.after_data["deleted_at"] is not None


def test_department_mutations_are_audited(client: TestClient, db_session: Session) -> None:
    response = client.post("/api/departments", json={"code": "science"})
    assert response.status_code == 201
    department_id = response.json()["id"]
    assert client.put(f"/api/departments/{department_id}", json={"code": "mathematics"}).status_code == 200
    entries = logs(db_session, "department")
    assert [entry.action for entry in entries] == ["CREATE", "UPDATE"]
    assert entries[1].before_data["code"] == "science"
    assert entries[1].after_data["code"] == "mathematics"


@pytest.mark.parametrize("path,entity,query", [
    ("/api/employees/export", "employee_export", "?job_title_code=teacher"),
    ("/api/scientific-members/export", "scientific_member_export", "?academic_rank=استاد"),
    ("/api/schools/export", "school_export", "?school_code=SCH-001"),
    ("/api/teacher-observations/export", "teacher_observation_export", "?subject=ریاضی"),
    ("/api/amir-observations/export", "amir_observation_export", "?employee_job_title_code=amir"),
])
def test_every_global_export_is_audited_without_rows_or_file(client: TestClient, db_session: Session,
                                                            authenticated_user: User, path: str, entity: str, query: str) -> None:
    response = client.get(path + query)
    assert response.status_code == 200
    assert response.content.startswith(b"PK")
    entry = logs(db_session, entity, "EXPORT")[0]
    assert entry.user_id == authenticated_user.id
    assert entry.event_metadata["filters"]
    key, value = query.lstrip("?").split("=")
    assert entry.event_metadata["filters"][key] == value
    assert entry.before_data is None and entry.after_data is None
    assert set(entry.event_metadata) == {"filters", "sort_by", "sort_order"}
    assert "rows" not in json.dumps(entry.event_metadata)


def test_department_and_history_exports_are_scoped(client: TestClient, db_session: Session) -> None:
    department_id = _science_department_id(db_session)
    member = _create_observer(client, department_id)
    assert client.get(f"/api/departments/{department_id}/employees/export?city_district=کابل").status_code == 200
    entry = logs(db_session, "department_export", "EXPORT")[0]
    assert entry.entity_id == department_id
    assert entry.event_metadata["filters"] == {"department_id": department_id, "city_district": "کابل"}
    assert client.get(f"/api/scientific-members/{member['id']}/observations/export").status_code == 200
    entry = logs(db_session, "scientific_member_observation_export", "EXPORT")[0]
    assert entry.event_metadata["filters"]["scientific_member_id"] == member["id"]


def test_user_admin_actions_and_password_change_never_store_credentials(client: TestClient, db_session: Session,
                                                                        audit_admin: User, admin_headers: dict) -> None:
    payload = {"username": "managed", "full_name": "کاربر", "password": "very-secret-password", "role_code": "user", "is_active": True}
    response = client.post("/api/users", json=payload, headers=admin_headers)
    assert response.status_code == 201
    user_id = response.json()["id"]
    update = {key: value for key, value in payload.items() if key != "password"}
    update["full_name"] = "نام تغییر یافته"
    assert client.put(f"/api/users/{user_id}", json=update, headers=admin_headers).status_code == 200
    assert client.put(f"/api/users/{user_id}/password", json={"new_password": "another-secret-password"}, headers=admin_headers).status_code == 204
    assert client.delete(f"/api/users/{user_id}", headers=admin_headers).status_code == 204
    entries = logs(db_session, "user")
    assert [entry.action for entry in entries] == ["CREATE", "UPDATE", "PASSWORD_CHANGE", "DELETE"]
    assert all(entry.user_id == audit_admin.id for entry in entries)
    response = client.get("/api/audit-logs", headers=admin_headers)
    assert response.status_code == 200
    for forbidden in ("password_hash", "password", "$argon2", "very-secret-password", "another-secret-password", "access_token", "Authorization"):
        assert forbidden not in response.text
        assert forbidden not in json.dumps([(entry.before_data, entry.after_data, entry.event_metadata) for entry in entries])


def test_sensitive_keys_removed_recursively() -> None:
    sensitive = {"password": "secret", "PASSWORD_HASH": "hash", "Authorization": "Bearer token",
                 "access_token": "jwt", "SECRET_KEY": "key", "api-key": "credential"}
    assert sanitize_audit_data({"safe": 1, **sensitive, "nested": [sensitive, {"name": "keep"}]}) == {
        "safe": 1, "nested": [{}, {"name": "keep"}],
    }
    with pytest.raises(ValueError, match="Binary"):
        sanitize_audit_data({"file": b"workbook"})


def test_audit_ordering_pagination_filters_and_inclusive_dates(client: TestClient, db_session: Session,
                                                             audit_admin: User, admin_headers: dict, authenticated_user: User) -> None:
    first = create_employee(client)
    second = create_employee(client, name="دیگر")
    assert client.put(f"/api/employees/{first['id']}", json=employee_payload(name="تغییر")).status_code == 200
    entries = logs(db_session, "employee")
    response = client.get("/api/audit-logs", headers=admin_headers)
    assert [row["id"] for row in response.json()["items"]] == [entry.id for entry in reversed(entries)]
    assert client.get("/api/audit-logs?page_size=1&page=2", headers=admin_headers).json()["items"][0]["id"] == entries[1].id
    # Audit date filters use UTC days, even when the local day has changed.
    audit_day = datetime.now(timezone.utc).date()
    today = audit_day.isoformat()
    result = client.get(f"/api/audit-logs?user_id={authenticated_user.id}&entity_type=employee&entity_id={first['id']}&action=UPDATE&date_from={today}&date_to={today}", headers=admin_headers)
    assert result.status_code == 200
    assert result.json()["total"] == 1
    assert result.json()["items"][0]["id"] == entries[2].id
    assert client.get(f"/api/audit-logs?user_id={audit_admin.id}", headers=admin_headers).json()["total"] == 0
    assert client.get(f"/api/audit-logs?entity_id={second['id']}&action=UPDATE", headers=admin_headers).json()["total"] == 0
    tomorrow = (audit_day + timedelta(days=1)).isoformat()
    assert client.get(f"/api/audit-logs?date_from={tomorrow}", headers=admin_headers).json()["total"] == 0
    yesterday = (audit_day - timedelta(days=1)).isoformat()
    assert client.get(f"/api/audit-logs?date_to={yesterday}", headers=admin_headers).json()["total"] == 0
    ascending = client.get("/api/audit-logs?sort_order=asc", headers=admin_headers).json()
    assert [row["id"] for row in ascending["items"]] == [entry.id for entry in entries]
    assert client.get("/api/audit-logs?date_from=2026-09-27&date_to=2026-09-26", headers=admin_headers).status_code == 422
    assert client.get("/api/audit-logs?action=unsupported", headers=admin_headers).status_code == 422
    assert client.get("/api/audit-logs?date_to=9999-12-31", headers=admin_headers).status_code == 200


def test_client_cannot_spoof_actor_or_ip(client: TestClient, db_session: Session, authenticated_user: User, audit_admin: User) -> None:
    response = client.post("/api/employees", json=employee_payload(user_id=audit_admin.id, ip_address="1.2.3.4"),
                           headers={"X-Forwarded-For": "1.2.3.4"})
    assert response.status_code == 201
    entry = logs(db_session, "employee")[0]
    assert entry.user_id == authenticated_user.id
    assert entry.ip_address == "testclient"
    assert "user_id" not in entry.after_data
    assert "ip_address" not in entry.after_data


def test_failed_actions_and_failed_exports_produce_no_success_audit(client: TestClient, db_session: Session) -> None:
    assert client.post("/api/employees", json=employee_payload(department_ids=[999999])).status_code == 422
    assert client.delete("/api/employees/999999").status_code == 404
    assert client.get("/api/departments/999999/employees/export").status_code == 404
    assert db_session.scalar(select(func.count()).select_from(AuditLog)) == 0


def test_audit_failure_rolls_back_employee_action(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*args, **kwargs):
        raise RuntimeError("simulated audit storage failure")
    monkeypatch.setattr(audit_service.repository, "create", fail)
    with pytest.raises(RuntimeError, match="audit storage failure"):
        create_employee(client)
    assert db_session.scalar(select(func.count()).select_from(Employee)) == 0
    assert db_session.scalar(select(func.count()).select_from(AuditLog)) == 0


def test_failed_workbook_generation_is_not_audited(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*args, **kwargs):
        raise RuntimeError("simulated workbook failure")
    monkeypatch.setattr(ExcelExportService, "_employee_response", fail)
    with pytest.raises(RuntimeError, match="workbook failure"):
        client.get("/api/employees/export")
    assert logs(db_session, "employee_export") == []


def test_export_does_not_silently_ignore_audit_failure(client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*args, **kwargs):
        raise RuntimeError("simulated audit failure")
    monkeypatch.setattr(audit_service.repository, "create", fail)
    with pytest.raises(RuntimeError, match="audit failure"):
        client.get("/api/employees/export")
    assert logs(db_session, "employee_export") == []


def test_failed_school_section_operation_rolls_back_all_partial_logs(client: TestClient, db_session: Session) -> None:
    # The first section has already flushed before the second invalid reference is discovered.
    response = client.post("/api/schools", json=_school_payload(grade_statistics=[
        _grade(1, _section("الف"), _section("ب", id=999999)),
    ]))
    assert response.status_code == 422
    assert db_session.scalar(select(func.count()).select_from(School)) == 0
    assert logs(db_session, "school_grade_section") == []


def test_audit_preserves_deleted_actor_and_has_no_mutation_api(client: TestClient, db_session: Session,
                                                            authenticated_user: User, admin_headers: dict) -> None:
    create_employee(client)
    entry = logs(db_session, "employee")[0]
    assert client.delete(f"/api/users/{authenticated_user.id}", headers=admin_headers).status_code == 204
    response = client.get(f"/api/audit-logs/{entry.id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["user"]["username"] == authenticated_user.username
    for method in ("PUT", "DELETE"):
        assert client.request(method, f"/api/audit-logs/{entry.id}", headers=admin_headers, json={}).status_code == 405
    entry.description = "cannot modify"
    with pytest.raises(ValueError, match="append-only"):
        db_session.commit()
    db_session.rollback()
    db_session.delete(entry)
    with pytest.raises(ValueError, match="append-only"):
        db_session.commit()
    db_session.rollback()


def test_postgresql_schema_and_migration_are_append_only_jsonb() -> None:
    sql = str(CreateTable(AuditLog.__table__).compile(dialect=postgresql.dialect()))
    for column in ("before_data", "after_data", "metadata"):
        assert f"{column} JSONB" in sql
    assert "ON DELETE RESTRICT" in sql
    assert "deleted_at" not in AuditLog.__table__.columns
    assert "updated_at" not in AuditLog.__table__.columns
    migration = Path(__file__).parents[1] / "alembic/versions/20260927_0012_create_audit_logs.py"
    source = migration.read_text(encoding="utf-8")
    assert "BEFORE UPDATE OR DELETE OR TRUNCATE" in source
    assert "20260927_0011" in source

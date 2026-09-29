import json
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.audit_codes import AuditAction, AuditEntity
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.services.audit_service import (
    AuditContext, audit_service, build_audit_changes, sanitize_audit_data,
)
from tests.test_audit_logs import admin_headers, audit_admin, create_employee, logs  # noqa: F401
from tests.test_employees import employee_payload


def test_update_several_fields_excludes_unchanged_and_timestamp_fields(client: TestClient, db_session: Session) -> None:
    employee = create_employee(client, notes="unchanged long notes" * 100)
    response = client.put(f"/api/employees/{employee['id']}", json=employee_payload(
        grade_post=5, step=3, notes="unchanged long notes" * 100,
    ))
    assert response.status_code == 200
    [entry] = logs(db_session, "employee", "UPDATE")
    assert entry.event_metadata == {"changes": {
        "grade_post": {"old": 4, "new": 5}, "step": {"old": 2, "new": 3},
    }}
    assert entry.before_data is None and entry.after_data is None


def test_unchanged_update_does_not_add_duplicate_activity(client: TestClient, db_session: Session) -> None:
    employee = create_employee(client)
    for _ in range(2):
        assert client.put(f"/api/employees/{employee['id']}", json=employee_payload()).status_code == 200
    assert len(logs(db_session, "employee")) == 1


def test_create_and_delete_omit_large_text_and_duplicate_audit_fields(client: TestClient, db_session: Session) -> None:
    employee = create_employee(client, notes="large notes" * 10000, subjects_taught="large subjects" * 10000)
    assert client.delete(f"/api/employees/{employee['id']}").status_code == 204
    for entry in logs(db_session, "employee"):
        assert entry.before_data is None and entry.after_data is None
        assert set(entry.event_metadata["record"]) == {"name", "father_name", "job_title_code"}
        assert len(json.dumps(entry.event_metadata)) < 200


def test_changed_long_text_is_retained_but_unchanged_text_is_not(client: TestClient, db_session: Session) -> None:
    employee = create_employee(client, notes="original")
    notes = "changed text" * 100
    assert client.put(f"/api/employees/{employee['id']}", json=employee_payload(notes=notes)).status_code == 200
    assert logs(db_session, "employee", "UPDATE")[0].event_metadata == {
        "changes": {"notes": {"old": "original", "new": notes}},
    }


def test_diff_sanitizes_nested_credentials_and_ignores_numeric_representation_changes() -> None:
    sensitive = {"DATABASE_URL": "secret", "connectionString": "secret", "postgres_user": "secret", "Authorization": "secret",
                 "jwt": "secret", "database": {"username": "secret", "password": "secret"}, "private_key": "secret"}
    before = {"name": "old", "nested": [{"phone_number": "070", **sensitive}], "subject_knowledge_score": Decimal("2.00"), "department_ids": [1, 2]}
    after = {"name": "new", "nested": [{"phone_number": "079", **sensitive}], "subject_knowledge_score": Decimal("2"), "department_ids": [2, 1]}
    changes = build_audit_changes(before, after)
    assert changes == {
        "name": {"old": "old", "new": "new"},
        "nested": {"old": [{"phone_number": "070"}], "new": [{"phone_number": "079"}]},
    }
    assert sanitize_audit_data({"nested": [sensitive]}) == {"nested": [{}]}


def test_legacy_snapshots_remain_stored_and_readable(
    client: TestClient, db_session: Session, authenticated_user, admin_headers: dict,
) -> None:
    before = {"name": "old", "notes": "same", "password_hash": "hidden"}
    after = {"name": "new", "notes": "same", "password_hash": "hidden"}
    # Simulate an append-only entry created by the previous application version.
    entry = AuditLog(user_id=authenticated_user.id, action="UPDATE", entity_type="employee", entity_id=15,
                     description="ویرایش کارمند", before_data=before, after_data=after)
    db_session.add(entry)
    db_session.commit()
    response = client.get(f"/api/audit-logs/{entry.id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["before_data"] == {"name": "old", "notes": "same"}
    assert response.json()["after_data"] == {"name": "new", "notes": "same"}
    assert response.json()["changes"] is None
    assert db_session.get(AuditLog, entry.id).before_data == before


def test_audit_update_failure_rolls_back_business_change_and_new_log(
    client: TestClient, db_session: Session, monkeypatch: pytest.MonkeyPatch,
) -> None:
    employee = create_employee(client)
    def fail(*args, **kwargs):
        raise RuntimeError("audit failure")
    monkeypatch.setattr(audit_service.repository, "create", fail)
    with pytest.raises(RuntimeError, match="audit failure"):
        client.put(f"/api/employees/{employee['id']}", json=employee_payload(name="not committed"))
    assert db_session.get(Employee, employee["id"]).name == "Ahmad"
    assert len(logs(db_session, "employee")) == 1


def test_log_action_cannot_store_sensitive_snapshots_or_metadata(db_session: Session, authenticated_user) -> None:
    entry = audit_service.log_action(db_session, action=AuditAction.UPDATE, entity_type=AuditEntity.EMPLOYEE,
        entity_id=1, context=AuditContext(authenticated_user.id),
        before_data={"name": "old", "password": "secret"},
        after_data={"name": "new", "password": "secret", "nested": {"access_token": "secret"}},
        metadata={"nested": [{"SECRET_KEY": "secret", "safe": "retained"}]})
    db_session.commit()
    assert entry.before_data is None and entry.after_data is None
    assert "secret" not in json.dumps(entry.event_metadata)
    assert entry.event_metadata["nested"] == [{"safe": "retained"}]
    assert entry.event_metadata["changes"]["name"] == {"old": "old", "new": "new"}

"""Exercise the deployment data migration against a fresh/partially seeded DB."""

import importlib.util
from datetime import datetime, timezone
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.department_labels import DEPARTMENT_DISPLAY_LABELS
from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment
from app.services.department_service import DepartmentService
from tests.test_employees import employee_payload


def apply_catalogue_migration(db: Session, direction: str = "upgrade") -> None:
    path = (
        Path(__file__).parents[1] / "alembic" / "versions"
        / "20260927_0013_seed_predefined_departments.py"
    )
    spec = importlib.util.spec_from_file_location("department_catalogue_migration", path)
    assert spec is not None and spec.loader is not None
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    # Execute the real Alembic operation, not a duplicated seed implementation.
    with Operations.context(MigrationContext.configure(db.connection())):
        getattr(migration, direction)()
    db.commit()
    db.expire_all()


def test_migration_initializes_fresh_database_and_authenticated_api(
    db_session: Session, client: TestClient,
) -> None:
    assert db_session.scalar(select(func.count()).select_from(Department)) == 0
    apply_catalogue_migration(db_session)

    response = client.get("/api/departments")
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 10
    assert {row["code"] for row in rows} == set(DEPARTMENT_DISPLAY_LABELS)
    assert len({row["id"] for row in rows}) == 10
    for row in rows:
        assert row["display_name"] == DEPARTMENT_DISPLAY_LABELS[row["code"]]
        assert row["created_at"] and row["updated_at"]

    # The data migration and optional repair CLI can both be repeated safely.
    apply_catalogue_migration(db_session)
    assert DepartmentService().seed_predefined_departments(db_session) == 0
    assert client.get("/api/departments").json() == rows


@pytest.mark.parametrize("initializer", ["migration", "seed"])
def test_initialization_preserves_existing_departments_and_employee_links(
    db_session: Session, initializer: str,
) -> None:
    active = Department(code="mathematics")
    deleted = Department(code="science", deleted_at=datetime.now(timezone.utc))
    legacy = Department(code="legacy_catalogue_entry")
    db_session.add_all([active, deleted, legacy])
    payload = employee_payload()
    payload.pop("department_ids")
    employee = Employee(**payload)
    db_session.add(employee)
    db_session.flush()
    link = EmployeeDepartment(employee_id=employee.id, department_id=active.id)
    db_session.add(link)
    db_session.commit()
    db_session.expire_all()
    before = {
        department.id: {
            column.name: getattr(department, column.name)
            for column in Department.__table__.columns
        }
        for department in (active, deleted, legacy)
    }
    link_id, employee_id, department_id = link.id, employee.id, active.id

    if initializer == "migration":
        apply_catalogue_migration(db_session)
        apply_catalogue_migration(db_session)
    else:
        assert DepartmentService().seed_predefined_departments(db_session) == 8
        assert DepartmentService().seed_predefined_departments(db_session) == 0

    assert db_session.scalar(select(func.count()).select_from(Department)) == 11
    for department_id_before, snapshot in before.items():
        preserved = db_session.get(Department, department_id_before)
        assert preserved is not None
        assert {
            column.name: getattr(preserved, column.name)
            for column in Department.__table__.columns
        } == snapshot
    preserved_link = db_session.get(EmployeeDepartment, link_id)
    assert preserved_link is not None
    assert preserved_link.employee_id == employee_id
    assert preserved_link.department_id == department_id
    assert preserved_link.deleted_at is None


def test_migration_downgrade_does_not_remove_catalogue_data(db_session: Session) -> None:
    apply_catalogue_migration(db_session)
    original_ids = list(db_session.scalars(select(Department.id).order_by(Department.id)))
    apply_catalogue_migration(db_session, "downgrade")
    assert list(db_session.scalars(select(Department.id).order_by(Department.id))) == original_ids


def test_initialization_does_not_expose_deleted_departments(
    db_session: Session, client: TestClient,
) -> None:
    department = Department(code="science", deleted_at=datetime.now(timezone.utc))
    db_session.add(department)
    db_session.commit()
    department_id = department.id
    apply_catalogue_migration(db_session)
    assert DepartmentService().seed_predefined_departments(db_session) == 0
    rows = client.get("/api/departments").json()
    assert len(rows) == 9
    assert "science" not in {row["code"] for row in rows}
    assert client.get(f"/api/departments/{department_id}").status_code == 404


def test_seeded_departments_still_require_authentication(
    db_session: Session, anonymous_client: TestClient,
) -> None:
    apply_catalogue_migration(db_session)
    response = anonymous_client.get("/api/departments")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_failed_repair_rolls_back_all_new_departments(db_session: Session, monkeypatch) -> None:
    service = DepartmentService()
    original = service.repository.create_if_missing

    def fail_midway(db: Session, *, code: str) -> bool:
        if code == "science":
            raise RuntimeError("Simulated database failure")
        return original(db, code=code)

    monkeypatch.setattr(service.repository, "create_if_missing", fail_midway)
    with pytest.raises(RuntimeError, match="Simulated database failure"):
        service.seed_predefined_departments(db_session)
    assert db_session.scalar(select(func.count()).select_from(Department)) == 0

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.services.department_service import DepartmentService


def test_seed_departments_is_idempotent(db_session: Session) -> None:
    service = DepartmentService()

    assert service.seed_predefined_departments(db_session) == 1
    assert service.seed_predefined_departments(db_session) == 0

    department_count = db_session.scalar(select(func.count()).select_from(Department))
    assert department_count == 1


def test_department_api_create_get_and_update(client: TestClient) -> None:
    create_response = client.post(
        "/api/departments",
        json={"code": "education_training"},
    )

    assert create_response.status_code == 201
    created_department = create_response.json()
    assert created_department["code"] == "education_training"
    assert created_department["display_name"] == "تعلیم و تربیه"

    get_response = client.get(f"/api/departments/{created_department['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == created_department["id"]

    update_response = client.put(
        f"/api/departments/{created_department['id']}",
        json={"code": "education_training"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["code"] == "education_training"


def test_department_list_excludes_soft_deleted_records(
    client: TestClient,
    db_session: Session,
) -> None:
    department = Department(code="education_training")
    db_session.add(department)
    db_session.commit()
    department.deleted_at = datetime.now(timezone.utc)
    db_session.commit()

    response = client.get("/api/departments")

    assert response.status_code == 200
    assert response.json() == []

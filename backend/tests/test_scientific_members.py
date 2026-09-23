from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.services.department_service import DepartmentService


def _seed_departments(db_session: Session) -> dict[str, Department]:
    DepartmentService().seed_predefined_departments(db_session)
    return {
        department.code: department
        for department in db_session.scalars(select(Department))
    }


def _payload(department_id: int, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "فاطمه",
        "surname": "احمدی",
        "father_name": "محمد",
        "phone_number": "0700000000",
        "academic_rank": "پوهنمل",
        "department_id": department_id,
        "notes": "ملاحظات تفصیلی عضو علمی",
    }
    payload.update(overrides)
    return payload


def _create_member(client: TestClient, department_id: int, **overrides: object) -> dict[str, object]:
    response = client.post("/api/scientific-members", json=_payload(department_id, **overrides))
    assert response.status_code == 201
    return response.json()


def test_create_scientific_member_with_active_department(
    client: TestClient,
    db_session: Session,
) -> None:
    departments = _seed_departments(db_session)

    response = client.post(
        "/api/scientific-members",
        json=_payload(departments["science"].id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["department_id"] == departments["science"].id
    assert body["department"]["code"] == "science"


def test_rejects_invalid_department_id(client: TestClient) -> None:
    response = client.post("/api/scientific-members", json=_payload(999999))

    assert response.status_code == 422


def test_rejects_soft_deleted_department(client: TestClient, db_session: Session) -> None:
    departments = _seed_departments(db_session)
    department = departments["science"]
    department.deleted_at = datetime.now(timezone.utc)
    db_session.commit()

    response = client.post("/api/scientific-members", json=_payload(department.id))

    assert response.status_code == 422


def test_get_scientific_member_by_id(client: TestClient, db_session: Session) -> None:
    departments = _seed_departments(db_session)
    created = _create_member(client, departments["science"].id)

    response = client.get(f"/api/scientific-members/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_scientific_member(client: TestClient, db_session: Session) -> None:
    departments = _seed_departments(db_session)
    created = _create_member(client, departments["science"].id)

    response = client.put(
        f"/api/scientific-members/{created['id']}",
        json=_payload(
            departments["mathematics"].id,
            surname="صادقی",
            academic_rank="پوهاند",
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["surname"] == "صادقی"
    assert body["academic_rank"] == "پوهاند"
    assert body["department"]["code"] == "mathematics"


def test_soft_delete_scientific_member(client: TestClient, db_session: Session) -> None:
    departments = _seed_departments(db_session)
    created = _create_member(client, departments["science"].id)

    response = client.delete(f"/api/scientific-members/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/scientific-members/{created['id']}").status_code == 404


def test_deleted_scientific_member_is_excluded_from_list(
    client: TestClient,
    db_session: Session,
) -> None:
    departments = _seed_departments(db_session)
    created = _create_member(client, departments["science"].id)
    assert client.delete(f"/api/scientific-members/{created['id']}").status_code == 204

    response = client.get("/api/scientific-members")

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_filter_scientific_members_by_department(
    client: TestClient,
    db_session: Session,
) -> None:
    departments = _seed_departments(db_session)
    _create_member(client, departments["science"].id, name="حبیب")
    expected = _create_member(client, departments["mathematics"].id, name="زهرا")

    response = client.get(
        "/api/scientific-members",
        params={"department_id": departments["mathematics"].id},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == expected["id"]


def test_filter_scientific_members_by_academic_rank(
    client: TestClient,
    db_session: Session,
) -> None:
    departments = _seed_departments(db_session)
    _create_member(client, departments["science"].id, academic_rank="پوهنمل")
    expected = _create_member(client, departments["science"].id, academic_rank="پوهاند")

    response = client.get("/api/scientific-members", params={"academic_rank": "پوهاند"})

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == expected["id"]


def test_combined_filters_use_and_logic(client: TestClient, db_session: Session) -> None:
    departments = _seed_departments(db_session)
    expected = _create_member(
        client,
        departments["science"].id,
        name="لیلا",
        academic_rank="پوهنمل",
    )
    _create_member(
        client,
        departments["science"].id,
        name="لیلا",
        academic_rank="پوهاند",
    )
    _create_member(
        client,
        departments["mathematics"].id,
        name="لیلا",
        academic_rank="پوهنمل",
    )

    response = client.get(
        "/api/scientific-members",
        params={
            "name": "لیلا",
            "academic_rank": "پوهنمل",
            "department_id": departments["science"].id,
        },
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["id"] == expected["id"]


def test_scientific_member_response_returns_full_details(
    client: TestClient,
    db_session: Session,
) -> None:
    departments = _seed_departments(db_session)
    created = _create_member(client, departments["science"].id)

    body = client.get(f"/api/scientific-members/{created['id']}").json()

    assert body == {
        "id": created["id"],
        "name": "فاطمه",
        "surname": "احمدی",
        "father_name": "محمد",
        "phone_number": "0700000000",
        "academic_rank": "پوهنمل",
        "department_id": departments["science"].id,
        "department": {
            "id": departments["science"].id,
            "code": "science",
            "display_name": "ساینس",
            "created_at": body["department"]["created_at"],
            "updated_at": body["department"]["updated_at"],
        },
        "notes": "ملاحظات تفصیلی عضو علمی",
        "observation_count": 0,
        "created_at": body["created_at"],
        "updated_at": body["updated_at"],
    }

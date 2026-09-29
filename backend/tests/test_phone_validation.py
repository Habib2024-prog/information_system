import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.schemas.scientific_member import ScientificMemberCreate, ScientificMemberUpdate
from tests.test_scientific_members import _payload, _seed_departments


@pytest.mark.parametrize("schema", [ScientificMemberCreate, ScientificMemberUpdate])
@pytest.mark.parametrize(("phone", "expected"), [
    ("0712345678", "0712345678"),
    (" 0712345678 ", "0712345678"),
    ("۰۷۱۲۳۴۵۶۷۸", "0712345678"),
    ("٠٧١٢٣٤٥٦٧٨", "0712345678"),
])
def test_scientific_member_phone_uses_canonical_ten_digit_text(
    schema: type[ScientificMemberCreate | ScientificMemberUpdate], phone: str, expected: str,
) -> None:
    member = schema(**_payload(1, phone_number=phone))
    assert member.phone_number == expected
    assert isinstance(member.phone_number, str)


@pytest.mark.parametrize("phone", [
    "", "071234567", "07123456789", "07123abc78", "+93712345678",
    "0712 345678", "0712-345678", "(071)2345678", "0712345678.0",
])
def test_scientific_member_phone_rejects_noncanonical_values(phone: str) -> None:
    with pytest.raises(ValidationError, match="شماره تماس باید دقیقاً ۱۰ رقم باشد"):
        ScientificMemberCreate(**_payload(1, phone_number=phone))


def test_scientific_member_create_and_update_validate_phone_at_api_boundary(
    client: TestClient, db_session: Session,
) -> None:
    departments = _seed_departments(db_session)
    created = client.post(
        "/api/scientific-members",
        json=_payload(departments["science"].id, phone_number="۰۷۱۲۳۴۵۶۷۸"),
    )
    assert created.status_code == 201
    member_id = created.json()["id"]
    assert created.json()["phone_number"] == "0712345678"

    invalid = client.put(
        f"/api/scientific-members/{member_id}",
        json=_payload(departments["science"].id, phone_number="071234567"),
    )
    assert invalid.status_code == 422
    assert any(
        item["loc"][-1] == "phone_number" and "شماره تماس باید دقیقاً ۱۰ رقم باشد" in item["msg"]
        for item in invalid.json()["detail"]
    )
    assert client.get(f"/api/scientific-members/{member_id}").json()["phone_number"] == "0712345678"

    updated = client.put(
        f"/api/scientific-members/{member_id}",
        json=_payload(departments["science"].id, phone_number="٠٧١٢٣٤٥٦٧٨"),
    )
    assert updated.status_code == 200
    assert updated.json()["phone_number"] == "0712345678"

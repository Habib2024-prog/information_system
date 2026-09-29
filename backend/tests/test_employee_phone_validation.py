import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from tests.test_employees import employee_payload


@pytest.mark.parametrize("schema", [EmployeeCreate, EmployeeUpdate])
@pytest.mark.parametrize(("phone", "expected"), [
    ("0712345678", "0712345678"),
    (" 0712345678 ", "0712345678"),
    ("۰۷۱۲۳۴۵۶۷۸", "0712345678"),
    ("٠٧١٢٣٤٥٦٧٨", "0712345678"),
])
def test_employee_phone_is_canonical_ten_digit_text(
    schema: type[EmployeeCreate | EmployeeUpdate], phone: str, expected: str,
) -> None:
    employee = schema(**employee_payload(phone_number=phone))
    assert employee.phone_number == expected
    assert isinstance(employee.phone_number, str)


@pytest.mark.parametrize("phone", [
    "", "071234567", "07123456789", "07123abc78", "0712 345678",
    "+93712345678", "0712-345678", "(071)2345678", "0712345678.0",
])
def test_employee_phone_rejects_noncanonical_values(phone: str) -> None:
    with pytest.raises(ValidationError, match="شماره تماس باید دقیقاً ۱۰ رقم باشد"):
        EmployeeCreate(**employee_payload(phone_number=phone))


def test_employee_create_and_update_validate_phone_at_api_boundary(client: TestClient) -> None:
    created = client.post("/api/employees", json=employee_payload(phone_number="۰۷۱۲۳۴۵۶۷۸"))
    assert created.status_code == 201
    employee_id = created.json()["id"]
    assert created.json()["phone_number"] == "0712345678"

    invalid = client.put(
        f"/api/employees/{employee_id}", json=employee_payload(phone_number="071234567"),
    )
    assert invalid.status_code == 422
    assert any(
        item["loc"][-1] == "phone_number" and "شماره تماس باید دقیقاً ۱۰ رقم باشد" in item["msg"]
        for item in invalid.json()["detail"]
    )
    assert client.get(f"/api/employees/{employee_id}").json()["phone_number"] == "0712345678"

    updated = client.put(
        f"/api/employees/{employee_id}", json=employee_payload(phone_number="٠٧١٢٣٤٥٦٧٨"),
    )
    assert updated.status_code == 200
    assert updated.json()["phone_number"] == "0712345678"

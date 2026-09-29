from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, StrictStr, field_validator

from app.common.phone_numbers import normalize_phone_number
from app.schemas.department import DepartmentRead


class ScientificMemberWrite(BaseModel):
    name: str = Field(min_length=1)
    surname: str = Field(min_length=1)
    father_name: str = Field(min_length=1)
    phone_number: StrictStr
    academic_rank: str = Field(min_length=1)
    department_id: int
    notes: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        normalized = normalize_phone_number(value, optional=False)
        assert normalized is not None
        return normalized


class ScientificMemberCreate(ScientificMemberWrite):
    pass


class ScientificMemberUpdate(ScientificMemberWrite):
    pass


class ScientificMemberRead(BaseModel):
    id: int
    name: str
    surname: str
    father_name: str
    phone_number: str
    academic_rank: str
    department_id: int
    department: DepartmentRead
    notes: str | None
    observation_count: int
    created_at: datetime
    updated_at: datetime


class ScientificMemberListResponse(BaseModel):
    items: list[ScientificMemberRead]
    total: int
    page: int
    page_size: int


ScientificMemberSortField = Literal[
    "id",
    "name",
    "surname",
    "father_name",
    "phone_number",
    "academic_rank",
    "department_id",
]
SortOrder = Literal["asc", "desc"]

ObservationHistoryType = Literal["teacher", "amir_senior_teacher"]


class ScientificMemberObservationHistoryItem(BaseModel):
    observation_id: int
    observation_type: ObservationHistoryType
    observed_employee_id: int
    observed_employee_name: str
    observed_employee_father_name: str
    observed_employee_job_title_code: str
    observation_date: date
    subject: str
    total_score: Decimal
    final_result_code: str | None


class ScientificMemberObservationHistoryResponse(BaseModel):
    items: list[ScientificMemberObservationHistoryItem]
    total: int
    page: int
    page_size: int

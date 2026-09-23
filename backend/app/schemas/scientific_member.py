from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.department import DepartmentRead


class ScientificMemberWrite(BaseModel):
    name: str = Field(min_length=1)
    surname: str = Field(min_length=1)
    father_name: str = Field(min_length=1)
    phone_number: str = Field(min_length=1)
    academic_rank: str = Field(min_length=1)
    department_id: int
    notes: str | None = None


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

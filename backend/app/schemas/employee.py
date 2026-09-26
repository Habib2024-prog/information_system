from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.department import DepartmentRead


class EmployeeWrite(BaseModel):
    name: str = Field(min_length=1)
    father_name: str = Field(min_length=1)
    grandfather_name: str = Field(min_length=1)
    school_workplace: str = Field(min_length=1)
    city_district: str = Field(min_length=1)
    phone_number: str = Field(min_length=1)
    field_of_study: str = Field(min_length=1)
    education_level: str = Field(min_length=1)
    subjects_taught: str = Field(min_length=1)
    job_title_code: str = Field(min_length=1, max_length=100)
    teaching_experience: int = Field(ge=0)
    grade_post: int = Field(ge=0)
    step: int = Field(ge=0)
    successful_evaluation: str = Field(min_length=1)
    field_match_code: str = Field(min_length=1, max_length=100)
    notes: str | None = None
    department_ids: list[int] = Field(default_factory=list)


class EmployeeCreate(EmployeeWrite):
    pass


class EmployeeUpdate(EmployeeWrite):
    pass


class EmployeeRead(BaseModel):
    id: int
    name: str
    father_name: str
    grandfather_name: str
    school_workplace: str
    city_district: str
    phone_number: str
    field_of_study: str
    education_level: str
    subjects_taught: str
    job_title_code: str
    teaching_experience: int
    grade_post: int
    step: int
    successful_evaluation: str
    field_match_code: str
    notes: str | None
    observation_count: int
    departments: list[DepartmentRead]
    created_at: datetime
    updated_at: datetime


class EmployeeListResponse(BaseModel):
    items: list[EmployeeRead]
    total: int
    page: int
    page_size: int


EmployeeSortField = Literal[
    "id",
    "name",
    "father_name",
    "school_workplace",
    "city_district",
    "field_of_study",
    "education_level",
    "job_title_code",
    "grade_post",
    "step",
    "successful_evaluation",
    "field_match_code",
]
SortOrder = Literal["asc", "desc"]

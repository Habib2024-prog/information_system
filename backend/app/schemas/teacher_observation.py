from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TeacherObservationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observer_scientific_member_id: int
    observation_date: date
    observed_class: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    subject_knowledge_score: Decimal = Field(ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2)
    lesson_plan_score: Decimal = Field(ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2)
    classroom_management_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
    assessment_score: Decimal = Field(ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2)
    professional_learning_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
    community_engagement_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
    strengths: str | None = None
    improvements: str | None = None
    notes: str | None = None


class TeacherObservationCreate(TeacherObservationWrite):
    pass


class TeacherObservationUpdate(TeacherObservationWrite):
    pass


class ObserverBasicRead(BaseModel):
    id: int
    name: str
    surname: str
    father_name: str


class TeacherObservationListItem(BaseModel):
    id: int
    observation_date: date
    subject: str
    observer: ObserverBasicRead
    total_score: Decimal
    final_result_code: str | None


class TeacherObservationRead(TeacherObservationListItem):
    employee_id: int
    observer_scientific_member_id: int
    observed_class: str
    subject_knowledge_score: Decimal
    lesson_plan_score: Decimal
    classroom_management_score: Decimal
    assessment_score: Decimal
    professional_learning_score: Decimal
    community_engagement_score: Decimal
    strengths: str | None
    improvements: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class TeacherObservationListResponse(BaseModel):
    items: list[TeacherObservationListItem]
    total: int
    page: int
    page_size: int


TeacherObservationSortField = Literal[
    "id",
    "observation_date",
    "subject",
    "total_score",
    "final_result_code",
]
SortOrder = Literal["asc", "desc"]

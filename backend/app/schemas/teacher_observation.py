from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.observation_validation import CompetencyScore, ObservationDate


class TeacherObservationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observer_scientific_member_id: int
    observation_date: ObservationDate
    observed_class: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    subject_knowledge_score: CompetencyScore
    lesson_plan_score: CompetencyScore
    classroom_management_score: CompetencyScore
    assessment_score: CompetencyScore
    professional_learning_score: CompetencyScore
    community_engagement_score: CompetencyScore
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


class TeacherObservationGlobalListItem(TeacherObservationListItem):
    employee_id: int
    employee_name: str
    employee_father_name: str
    employee_school_workplace: str
    employee_job_title_code: str


class TeacherObservationGlobalListResponse(BaseModel):
    items: list[TeacherObservationGlobalListItem]
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

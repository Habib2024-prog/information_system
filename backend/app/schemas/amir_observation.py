from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.observation_validation import CompetencyScore, ObservationDate


class AmirObservationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observer_scientific_member_id: int
    observation_date: ObservationDate
    observed_class: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    responsibility_score: CompetencyScore
    professional_leadership_score: CompetencyScore
    community_relations_score: CompetencyScore
    professional_development_score: CompetencyScore
    strengths: str | None = None
    improvements: str | None = None
    notes: str | None = None


class AmirObservationCreate(AmirObservationWrite):
    pass


class AmirObservationUpdate(AmirObservationWrite):
    pass


class AmirObservationObserverRead(BaseModel):
    id: int
    name: str
    surname: str
    father_name: str


class AmirObservationListItem(BaseModel):
    id: int
    observation_date: date
    subject: str
    observer: AmirObservationObserverRead
    total_score: Decimal
    final_result_code: str | None


class AmirObservationRead(AmirObservationListItem):
    employee_id: int
    observer_scientific_member_id: int
    observed_class: str
    responsibility_score: Decimal
    professional_leadership_score: Decimal
    community_relations_score: Decimal
    professional_development_score: Decimal
    strengths: str | None
    improvements: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AmirObservationListResponse(BaseModel):
    items: list[AmirObservationListItem]
    total: int
    page: int
    page_size: int


class AmirObservationGlobalListItem(AmirObservationListItem):
    employee_id: int
    employee_name: str
    employee_father_name: str
    employee_school_workplace: str
    employee_job_title_code: str


class AmirObservationGlobalListResponse(BaseModel):
    items: list[AmirObservationGlobalListItem]
    total: int
    page: int
    page_size: int


AmirObservationSortField = Literal[
    "id",
    "observation_date",
    "subject",
    "total_score",
    "final_result_code",
]
SortOrder = Literal["asc", "desc"]

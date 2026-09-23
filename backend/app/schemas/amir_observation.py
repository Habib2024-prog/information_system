from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AmirObservationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    observer_scientific_member_id: int
    observation_date: date
    observed_class: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    responsibility_score: Decimal = Field(ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2)
    professional_leadership_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
    community_relations_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
    professional_development_score: Decimal = Field(
        ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2
    )
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


AmirObservationSortField = Literal[
    "id",
    "observation_date",
    "subject",
    "total_score",
    "final_result_code",
]
SortOrder = Literal["asc", "desc"]

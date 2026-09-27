from typing import Literal

from pydantic import BaseModel, Field


class DashboardTotals(BaseModel):
    employees: int = Field(ge=0)
    scientific_members: int = Field(ge=0)
    schools: int = Field(ge=0)
    observations: int = Field(ge=0)


class ObservationResultCount(BaseModel):
    final_result_code: str | None
    count: int = Field(ge=0)


class DashboardObservationOverview(BaseModel):
    observation_type: Literal["teacher", "amir_senior_teacher"]
    total: int = Field(ge=0)
    results: list[ObservationResultCount]


class DashboardSummary(BaseModel):
    totals: DashboardTotals
    observation_overview: list[DashboardObservationOverview]

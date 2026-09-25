from datetime import date

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.amir_observation_repository import AmirObservationFilters
from app.repositories.teacher_observation_repository import TeacherObservationFilters
from app.schemas.amir_observation import (
    AmirObservationGlobalListResponse,
    AmirObservationSortField,
    SortOrder as AmirSortOrder,
)
from app.schemas.teacher_observation import (
    SortOrder as TeacherSortOrder,
    TeacherObservationGlobalListResponse,
    TeacherObservationSortField,
)
from app.services.amir_observation_service import AmirObservationService
from app.services.teacher_observation_service import TeacherObservationService

router = APIRouter(tags=["observations"])
DbSession = Annotated[Session, Depends(get_db)]
teacher_service = TeacherObservationService()
amir_service = AmirObservationService()


@router.get("/teacher-observations", response_model=TeacherObservationGlobalListResponse)
def list_teacher_observations(
    db: DbSession,
    search: str | None = None,
    employee_id: int | None = None,
    observer_scientific_member_id: int | None = None,
    observation_date_from: date | None = None,
    observation_date_to: date | None = None,
    subject: str | None = None,
    final_result_code: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: TeacherObservationSortField = "observation_date",
    sort_order: TeacherSortOrder = "desc",
) -> TeacherObservationGlobalListResponse:
    return teacher_service.list_all_observations(
        db,
        filters=TeacherObservationFilters(
            search=search,
            employee_id=employee_id,
            observation_date_from=observation_date_from,
            observation_date_to=observation_date_to,
            subject=subject,
            observer_scientific_member_id=observer_scientific_member_id,
            final_result_code=final_result_code,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/amir-observations", response_model=AmirObservationGlobalListResponse)
def list_amir_observations(
    db: DbSession,
    search: str | None = None,
    employee_id: int | None = None,
    employee_job_title_code: str | None = None,
    observer_scientific_member_id: int | None = None,
    observation_date_from: date | None = None,
    observation_date_to: date | None = None,
    subject: str | None = None,
    final_result_code: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: AmirObservationSortField = "observation_date",
    sort_order: AmirSortOrder = "desc",
) -> AmirObservationGlobalListResponse:
    return amir_service.list_all_observations(
        db,
        filters=AmirObservationFilters(
            search=search,
            employee_id=employee_id,
            employee_job_title_code=employee_job_title_code,
            observation_date_from=observation_date_from,
            observation_date_to=observation_date_to,
            subject=subject,
            observer_scientific_member_id=observer_scientific_member_id,
            final_result_code=final_result_code,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

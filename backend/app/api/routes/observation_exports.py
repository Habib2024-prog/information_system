from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.amir_observation_repository import AmirObservationFilters
from app.repositories.teacher_observation_repository import TeacherObservationFilters
from app.schemas.amir_observation import AmirObservationSortField, SortOrder as AmirSortOrder
from app.schemas.teacher_observation import (
    SortOrder as TeacherSortOrder,
    TeacherObservationSortField,
)
from app.services.excel_export_service import ExcelExportService


router = APIRouter(tags=["صدور اکسل مشاهدات"])
DbSession = Annotated[Session, Depends(get_db)]
excel_export_service = ExcelExportService()


@router.get("/teacher-observations/export")
def export_teacher_observations(
    db: DbSession,
    employee_id: int | None = None,
    observer_scientific_member_id: int | None = None,
    observation_date_from: date | None = None,
    observation_date_to: date | None = None,
    subject: str | None = None,
    final_result_code: str | None = None,
    sort_by: TeacherObservationSortField = "id",
    sort_order: TeacherSortOrder = "asc",
) -> Response:
    return excel_export_service.export_teacher_observations(
        db,
        employee_id=employee_id,
        filters=TeacherObservationFilters(
            observation_date_from=observation_date_from,
            observation_date_to=observation_date_to,
            subject=subject,
            observer_scientific_member_id=observer_scientific_member_id,
            final_result_code=final_result_code,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/amir-observations/export")
def export_amir_observations(
    db: DbSession,
    employee_id: int | None = None,
    observer_scientific_member_id: int | None = None,
    observation_date_from: date | None = None,
    observation_date_to: date | None = None,
    subject: str | None = None,
    final_result_code: str | None = None,
    sort_by: AmirObservationSortField = "id",
    sort_order: AmirSortOrder = "asc",
) -> Response:
    return excel_export_service.export_amir_observations(
        db,
        employee_id=employee_id,
        filters=AmirObservationFilters(
            observation_date_from=observation_date_from,
            observation_date_to=observation_date_to,
            subject=subject,
            observer_scientific_member_id=observer_scientific_member_id,
            final_result_code=final_result_code,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
    )

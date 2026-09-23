from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.teacher_observation_repository import TeacherObservationFilters
from app.schemas.teacher_observation import (
    SortOrder,
    TeacherObservationCreate,
    TeacherObservationListResponse,
    TeacherObservationRead,
    TeacherObservationSortField,
    TeacherObservationUpdate,
)
from app.services.teacher_observation_service import (
    InvalidObservationObserverError,
    ObservationEmployeeNotFoundError,
    ObservationEmployeeNotTeacherError,
    TeacherObservationNotFoundError,
    TeacherObservationService,
)


router = APIRouter(
    prefix="/employees/{employee_id}/teacher-observations",
    tags=["مشاهدات معلم"],
)
DbSession = Annotated[Session, Depends(get_db)]
service = TeacherObservationService()


@router.get("", response_model=TeacherObservationListResponse)
def list_observations(
    employee_id: int,
    db: DbSession,
    observation_date_from: date | None = None,
    observation_date_to: date | None = None,
    subject: str | None = None,
    observer_scientific_member_id: int | None = None,
    final_result_code: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: TeacherObservationSortField = "id",
    sort_order: SortOrder = "asc",
) -> TeacherObservationListResponse:
    try:
        return service.list_observations(
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
            page=page,
            page_size=page_size,
        )
    except ObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error


@router.get("/{observation_id}", response_model=TeacherObservationRead)
def get_observation(
    employee_id: int,
    observation_id: int,
    db: DbSession,
) -> TeacherObservationRead:
    try:
        return service.get_observation(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
    except ObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except TeacherObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error


@router.post("", response_model=TeacherObservationRead, status_code=status.HTTP_201_CREATED)
def create_observation(
    employee_id: int,
    data: TeacherObservationCreate,
    db: DbSession,
) -> TeacherObservationRead:
    try:
        return service.create_observation(db, employee_id=employee_id, data=data)
    except ObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except ObservationEmployeeNotTeacherError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="مشاهده معلم فقط برای کارمند با عنوان وظیفه معلم ثبت می‌شود.",
        ) from error
    except InvalidObservationObserverError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="مشاهده‌کننده انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.put("/{observation_id}", response_model=TeacherObservationRead)
def update_observation(
    employee_id: int,
    observation_id: int,
    data: TeacherObservationUpdate,
    db: DbSession,
) -> TeacherObservationRead:
    try:
        return service.update_observation(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
            data=data,
        )
    except ObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except TeacherObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error
    except InvalidObservationObserverError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="مشاهده‌کننده انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.delete("/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation(employee_id: int, observation_id: int, db: DbSession) -> Response:
    try:
        service.delete_observation(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
    except ObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except TeacherObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)

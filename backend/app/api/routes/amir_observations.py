from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.amir_observation_repository import AmirObservationFilters
from app.schemas.amir_observation import (
    AmirObservationCreate,
    AmirObservationListResponse,
    AmirObservationRead,
    AmirObservationSortField,
    AmirObservationUpdate,
    SortOrder,
)
from app.services.amir_observation_service import (
    AmirObservationEmployeeNotFoundError,
    AmirObservationNotFoundError,
    AmirObservationService,
    IneligibleAmirObservationEmployeeError,
    InvalidAmirObservationObserverError,
)


router = APIRouter(
    prefix="/employees/{employee_id}/amir-observations",
    tags=["مشاهدات آمر/معلم ارشد"],
)
DbSession = Annotated[Session, Depends(get_db)]
service = AmirObservationService()


@router.get("", response_model=AmirObservationListResponse)
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
    sort_by: AmirObservationSortField = "id",
    sort_order: SortOrder = "asc",
) -> AmirObservationListResponse:
    try:
        return service.list_observations(
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
            page=page,
            page_size=page_size,
        )
    except AmirObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error


@router.get("/{observation_id}", response_model=AmirObservationRead)
def get_observation(
    employee_id: int,
    observation_id: int,
    db: DbSession,
) -> AmirObservationRead:
    try:
        return service.get_observation(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
    except AmirObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except AmirObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error


@router.post("", response_model=AmirObservationRead, status_code=status.HTTP_201_CREATED)
def create_observation(
    employee_id: int,
    data: AmirObservationCreate,
    db: DbSession,
) -> AmirObservationRead:
    try:
        return service.create_observation(db, employee_id=employee_id, data=data)
    except AmirObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except IneligibleAmirObservationEmployeeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="مشاهده آمر/معلم ارشد فقط برای آمر یا معلم ارشد ثبت می‌شود.",
        ) from error
    except InvalidAmirObservationObserverError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="مشاهده‌کننده انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.put("/{observation_id}", response_model=AmirObservationRead)
def update_observation(
    employee_id: int,
    observation_id: int,
    data: AmirObservationUpdate,
    db: DbSession,
) -> AmirObservationRead:
    try:
        return service.update_observation(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
            data=data,
        )
    except AmirObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except AmirObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error
    except InvalidAmirObservationObserverError as error:
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
    except AmirObservationEmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except AmirObservationNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مشاهده یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)

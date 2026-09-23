from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.school_repository import SchoolFilters
from app.schemas.school import (
    SchoolCreate,
    SchoolGradeStatisticRead,
    SchoolListResponse,
    SchoolRead,
    SchoolSortField,
    SchoolUpdate,
    SortOrder,
)
from app.services.school_service import (
    SchoolCodeExistsError,
    SchoolNotFoundError,
    SchoolService,
    UndefinedGenderTypeCodeError,
    UndefinedSchoolTypeCodeError,
)


router = APIRouter(prefix="/schools", tags=["مکاتب"])
DbSession = Annotated[Session, Depends(get_db)]
service = SchoolService()


@router.get("", response_model=SchoolListResponse)
def list_schools(
    db: DbSession,
    search: str | None = None,
    school_name: str | None = None,
    school_code: str | None = None,
    school_type_code: str | None = None,
    gender_type_code: str | None = None,
    school_formation: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: SchoolSortField = "id",
    sort_order: SortOrder = "asc",
) -> SchoolListResponse:
    return service.list_schools(
        db,
        filters=SchoolFilters(
            search=search,
            school_name=school_name,
            school_code=school_code,
            school_type_code=school_type_code,
            gender_type_code=gender_type_code,
            school_formation=school_formation,
        ),
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{school_id}/grade-statistics", response_model=list[SchoolGradeStatisticRead])
def list_grade_statistics(school_id: int, db: DbSession) -> list[SchoolGradeStatisticRead]:
    try:
        return service.list_grade_statistics(db, school_id)
    except SchoolNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مکتب یافت نشد.") from error


@router.get("/{school_id}", response_model=SchoolRead)
def get_school(school_id: int, db: DbSession) -> SchoolRead:
    try:
        return service.get_school(db, school_id)
    except SchoolNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مکتب یافت نشد.") from error


@router.post("", response_model=SchoolRead, status_code=status.HTTP_201_CREATED)
def create_school(data: SchoolCreate, db: DbSession) -> SchoolRead:
    try:
        return service.create_school(db, data)
    except SchoolCodeExistsError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="کد مکتب قبلاً ثبت شده است.") from error
    except UndefinedSchoolTypeCodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="نوع مکتب معتبر نیست.") from error
    except UndefinedGenderTypeCodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="نوع جنسیت معتبر نیست.") from error


@router.put("/{school_id}", response_model=SchoolRead)
def update_school(school_id: int, data: SchoolUpdate, db: DbSession) -> SchoolRead:
    try:
        return service.update_school(db, school_id, data)
    except SchoolNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مکتب یافت نشد.") from error
    except SchoolCodeExistsError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="کد مکتب قبلاً ثبت شده است.") from error
    except UndefinedSchoolTypeCodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="نوع مکتب معتبر نیست.") from error
    except UndefinedGenderTypeCodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="نوع جنسیت معتبر نیست.") from error


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(school_id: int, db: DbSession) -> Response:
    try:
        service.delete_school(db, school_id)
    except SchoolNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مکتب یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)

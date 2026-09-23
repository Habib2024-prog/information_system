from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.employee_repository import EmployeeFilters
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeRead,
    EmployeeSortField,
    EmployeeUpdate,
    SortOrder,
)
from app.services.employee_service import (
    EmployeeNotFoundError,
    EmployeeService,
    InvalidDepartmentIdsError,
    RequiredDepartmentUnavailableError,
)


router = APIRouter(prefix="/employees", tags=["کارمندان"])
DbSession = Annotated[Session, Depends(get_db)]
service = EmployeeService()


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    db: DbSession,
    search: str | None = None,
    name: str | None = None,
    father_name: str | None = None,
    school_workplace: str | None = None,
    city_district: str | None = None,
    field_of_study: str | None = None,
    education_level: str | None = None,
    job_title_code: str | None = None,
    grade_post: int | None = None,
    step: int | None = None,
    successful_evaluation: str | None = None,
    field_match_code: str | None = None,
    department_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: EmployeeSortField = "id",
    sort_order: SortOrder = "asc",
) -> EmployeeListResponse:
    filters = EmployeeFilters(
        search=search,
        name=name,
        father_name=father_name,
        school_workplace=school_workplace,
        city_district=city_district,
        field_of_study=field_of_study,
        education_level=education_level,
        job_title_code=job_title_code,
        grade_post=grade_post,
        step=step,
        successful_evaluation=successful_evaluation,
        field_match_code=field_match_code,
        department_id=department_id,
    )
    return service.list_employees(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: int, db: DbSession) -> EmployeeRead:
    try:
        return service.get_employee(db, employee_id)
    except EmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(data: EmployeeCreate, db: DbSession) -> EmployeeRead:
    try:
        return service.create_employee(db, data)
    except InvalidDepartmentIdsError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="یک یا چند دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error
    except RequiredDepartmentUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="دیپارتمنت تعلیم و تربیه فعال نیست.",
        ) from error


@router.put("/{employee_id}", response_model=EmployeeRead)
def update_employee(employee_id: int, data: EmployeeUpdate, db: DbSession) -> EmployeeRead:
    try:
        return service.update_employee(db, employee_id, data)
    except EmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    except InvalidDepartmentIdsError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="یک یا چند دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error
    except RequiredDepartmentUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="دیپارتمنت تعلیم و تربیه فعال نیست.",
        ) from error


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: DbSession) -> Response:
    try:
        service.delete_employee(db, employee_id)
    except EmployeeNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کارمند یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)

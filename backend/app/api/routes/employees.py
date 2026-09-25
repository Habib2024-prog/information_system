from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_employee_filters
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
from app.services.excel_export_service import ExcelExportService


router = APIRouter(prefix="/employees", tags=["کارمندان"])
DbSession = Annotated[Session, Depends(get_db)]
service = EmployeeService()
excel_export_service = ExcelExportService(employee_service=service)


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    db: DbSession,
    filters: Annotated[EmployeeFilters, Depends(get_employee_filters)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: EmployeeSortField = "id",
    sort_order: SortOrder = "asc",
) -> EmployeeListResponse:
    return service.list_employees(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
def export_employees(
    db: DbSession,
    filters: Annotated[EmployeeFilters, Depends(get_employee_filters)],
    sort_by: EmployeeSortField = "id",
    sort_order: SortOrder = "asc",
) -> Response:
    return excel_export_service.export_employees(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
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

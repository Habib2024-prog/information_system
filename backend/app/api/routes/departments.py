from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_employee_filters
from app.db.session import get_db
from app.repositories.employee_repository import EmployeeFilters
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate
from app.schemas.employee import EmployeeSortField, SortOrder
from app.services.department_service import (
    DepartmentCodeExistsError,
    DepartmentNotFoundError,
    DepartmentService,
    UndefinedDepartmentCodeError,
)
from app.services.employee_service import (
    DepartmentNotFoundForEmployeeExportError,
    EmployeeService,
)
from app.services.excel_export_service import ExcelExportService


router = APIRouter(prefix="/departments", tags=["دیپارتمنت‌ها"])
DbSession = Annotated[Session, Depends(get_db)]
service = DepartmentService()
employee_service = EmployeeService()
excel_export_service = ExcelExportService(employee_service=employee_service)


@router.get("", response_model=list[DepartmentRead])
def list_departments(db: DbSession) -> list[DepartmentRead]:
    return service.list_departments(db)


@router.get("/{department_id}/employees/export")
def export_department_employees(
    department_id: int,
    db: DbSession,
    filters: Annotated[EmployeeFilters, Depends(get_employee_filters)],
    sort_by: EmployeeSortField = "id",
    sort_order: SortOrder = "asc",
) -> Response:
    try:
        return excel_export_service.export_department_employees(
            db,
            department_id=department_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    except DepartmentNotFoundForEmployeeExportError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="دیپارتمنت یافت نشد.") from error


@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(department_id: int, db: DbSession) -> DepartmentRead:
    try:
        return service.get_department(db, department_id)
    except DepartmentNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="دیپارتمنت یافت نشد.") from error


@router.post("", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(data: DepartmentCreate, db: DbSession) -> DepartmentRead:
    try:
        return service.create_department(db, data)
    except UndefinedDepartmentCodeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="کد دیپارتمنت در فهرست تعریف‌شده وجود ندارد.",
        ) from error
    except DepartmentCodeExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="کد دیپارتمنت قبلاً ثبت شده است.",
        ) from error


@router.put("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: DbSession,
) -> DepartmentRead:
    try:
        return service.update_department(db, department_id, data)
    except DepartmentNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="دیپارتمنت یافت نشد.") from error
    except UndefinedDepartmentCodeError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="کد دیپارتمنت در فهرست تعریف‌شده وجود ندارد.",
        ) from error
    except DepartmentCodeExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="کد دیپارتمنت قبلاً ثبت شده است.",
        ) from error

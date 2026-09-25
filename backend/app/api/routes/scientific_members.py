from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_scientific_member_filters
from app.db.session import get_db
from app.repositories.scientific_member_repository import ScientificMemberFilters
from app.repositories.scientific_member_observation_repository import (
    ScientificMemberObservationHistoryFilters,
)
from app.schemas.scientific_member import (
    ScientificMemberCreate,
    ScientificMemberListResponse,
    ScientificMemberObservationHistoryResponse,
    ObservationHistoryType,
    ScientificMemberRead,
    ScientificMemberSortField,
    ScientificMemberUpdate,
    SortOrder,
)
from app.services.scientific_member_service import (
    InvalidScientificMemberDepartmentError,
    ScientificMemberNotFoundError,
    ScientificMemberService,
)
from app.services.excel_export_service import ExcelExportService


router = APIRouter(prefix="/scientific-members", tags=["اعضای علمی"])
DbSession = Annotated[Session, Depends(get_db)]
service = ScientificMemberService()
excel_export_service = ExcelExportService(scientific_member_service=service)


@router.get("", response_model=ScientificMemberListResponse)
def list_members(
    db: DbSession,
    filters: Annotated[ScientificMemberFilters, Depends(get_scientific_member_filters)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: ScientificMemberSortField = "id",
    sort_order: SortOrder = "asc",
) -> ScientificMemberListResponse:
    return service.list_members(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
def export_members(
    db: DbSession,
    filters: Annotated[ScientificMemberFilters, Depends(get_scientific_member_filters)],
    sort_by: ScientificMemberSortField = "id",
    sort_order: SortOrder = "asc",
) -> Response:
    return excel_export_service.export_scientific_members(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{scientific_member_id}/observations/export")
def export_observation_history(
    scientific_member_id: int,
    db: DbSession,
) -> Response:
    try:
        return excel_export_service.export_scientific_member_observation_history(
            db,
            scientific_member_id=scientific_member_id,
        )
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error


@router.get("/{scientific_member_id}/observations", response_model=ScientificMemberObservationHistoryResponse)
def list_observation_history(
    scientific_member_id: int,
    db: DbSession,
    observation_type: ObservationHistoryType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    employee_id: int | None = None,
    final_result_code: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_order: SortOrder = "desc",
) -> ScientificMemberObservationHistoryResponse:
    try:
        return service.list_observation_history(
            db,
            scientific_member_id=scientific_member_id,
            filters=ScientificMemberObservationHistoryFilters(
                observation_type=observation_type,
                date_from=date_from,
                date_to=date_to,
                employee_id=employee_id,
                final_result_code=final_result_code,
            ),
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error


@router.get("/{member_id}", response_model=ScientificMemberRead)
def get_member(member_id: int, db: DbSession) -> ScientificMemberRead:
    try:
        return service.get_member(db, member_id)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error


@router.post("", response_model=ScientificMemberRead, status_code=status.HTTP_201_CREATED)
def create_member(data: ScientificMemberCreate, db: DbSession) -> ScientificMemberRead:
    try:
        return service.create_member(db, data)
    except InvalidScientificMemberDepartmentError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.put("/{member_id}", response_model=ScientificMemberRead)
def update_member(
    member_id: int,
    data: ScientificMemberUpdate,
    db: DbSession,
) -> ScientificMemberRead:
    try:
        return service.update_member(db, member_id, data)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error
    except InvalidScientificMemberDepartmentError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: DbSession) -> Response:
    try:
        service.delete_member(db, member_id)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
